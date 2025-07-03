import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"

interface CampanhaAgendada {
  id: number
  nome: string
  filtro_clientes: string
  data_agendamento: string
}

interface ProcessamentoResult {
  success: boolean
  message: string
  processadas: number
}

export async function GET(request: NextRequest) {
  try {
    // Verificar se a requisição tem o header de segurança do cron
    const authHeader = request.headers.get('x-cron-secret')
    const cronSecret = process.env.CRON_SECRET

    if (!authHeader || authHeader !== cronSecret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar campanhas agendadas que já passaram do horário
    const campanhasParaIniciar = await executeQuery(`
      SELECT 
        id,
        nome,
        filtro_clientes,
        data_agendamento
      FROM campanhas_envio_massa 
      WHERE 
        status = 'agendada' 
        AND data_agendamento <= NOW()
    `) as CampanhaAgendada[]

    if (!campanhasParaIniciar || campanhasParaIniciar.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma campanha agendada para iniciar",
        processadas: 0
      })
    }

    let processadas = 0

    // Processar cada campanha
    for (const campanha of campanhasParaIniciar) {
      try {
        // Criar registros de detalhes para a campanha
        await criarDetalhesEnvio(campanha.id, JSON.parse(campanha.filtro_clientes))

        // Atualizar status da campanha para "enviando"
        await executeQuery(`
          UPDATE campanhas_envio_massa 
          SET 
            status = 'enviando',
            data_inicio = NOW()
          WHERE id = ?
        `, [campanha.id])

        processadas++
        console.log(`Campanha ${campanha.id} - ${campanha.nome} iniciada`)

      } catch (error) {
        console.error(`Erro ao processar campanha ${campanha.id}:`, error)
        
        // Marcar campanha com erro
        await executeQuery(`
          UPDATE campanhas_envio_massa 
          SET status = 'erro'
          WHERE id = ?
        `, [campanha.id])
      }
    }

    return NextResponse.json({
      success: true,
      message: `${processadas} campanhas iniciadas`,
      processadas
    } as ProcessamentoResult)

  } catch (error) {
    console.error("Erro ao processar campanhas agendadas:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// Função auxiliar para criar registros de detalhes
async function criarDetalhesEnvio(campanhaId: number, filtro: any): Promise<void> {
  let whereClause = "WHERE 1=1"
  const params: any[] = []

  if (filtro.status) {
    whereClause += " AND status = ?"
    params.push(filtro.status)
  }

  if (filtro.vencidos === true) {
    whereClause += " AND data_vencimento < CURDATE()"
  } else if (filtro.vencidos === false) {
    whereClause += " AND data_vencimento >= CURDATE()"
  }

  if (filtro.proximos_vencimento === true) {
    whereClause += " AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)"
  }

  if (filtro.plano_id) {
    whereClause += " AND plano_id = ?"
    params.push(filtro.plano_id)
  }

  const clientes = await executeQuery(`
    SELECT id FROM clientes ${whereClause}
  `, params) as any[]

  // Inserir registros de detalhes para cada cliente
  for (const cliente of clientes) {
    await executeQuery(`
      INSERT INTO envios_massa_detalhes (
        campanha_id,
        cliente_id,
        status
      ) VALUES (?, ?, 'pendente')
    `, [campanhaId, cliente.id])
  }
} 