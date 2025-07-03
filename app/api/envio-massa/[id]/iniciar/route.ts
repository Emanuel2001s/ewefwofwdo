import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const campanhaId = parseInt(params.id)
    
    if (!campanhaId || isNaN(campanhaId)) {
      return NextResponse.json({ 
        error: "ID da campanha inválido" 
      }, { status: 400 })
    }

    // Verificar se a campanha existe e está no status correto
    const campanha = await executeQuery(`
      SELECT 
        id,
        nome,
        status,
        template_id,
        instancia_id,
        filtro_clientes,
        intervalo_segundos,
        total_clientes
      FROM campanhas_envio_massa 
      WHERE id = ?
    `, [campanhaId]) as any[]

    if (!campanha || campanha.length === 0) {
      return NextResponse.json({ 
        error: "Campanha não encontrada" 
      }, { status: 404 })
    }

    const campanhaData = campanha[0]

    // Verificar se a campanha pode ser iniciada
    if (!['rascunho', 'agendada'].includes(campanhaData.status)) {
      return NextResponse.json({ 
        error: "Campanha não pode ser iniciada. Status atual: " + campanhaData.status 
      }, { status: 400 })
    }

    // Verificar se a instância WhatsApp está disponível
    const instancia = await executeQuery(`
      SELECT id, nome, status
      FROM evolution_instancias 
      WHERE id = ?
    `, [campanhaData.instancia_id]) as any[]

    if (!instancia || instancia.length === 0) {
      return NextResponse.json({ 
        error: "Instância WhatsApp não encontrada" 
      }, { status: 400 })
    }

    const instanciaData = instancia[0]
    
    if (!['conectada', 'connected'].includes(instanciaData.status)) {
      return NextResponse.json({ 
        error: `Instância WhatsApp não está conectada. Status: ${instanciaData.status}` 
      }, { status: 400 })
    }

    // Verificar se existem detalhes de envio
    const detalhes = await executeQuery(`
      SELECT COUNT(*) as total 
      FROM envios_massa_detalhes 
      WHERE campanha_id = ?
    `, [campanhaId]) as any[]

    const totalDetalhes = detalhes[0]?.total || 0

    // Se não existem detalhes, criar agora
    if (totalDetalhes === 0) {
      await criarDetalhesEnvio(campanhaId, JSON.parse(campanhaData.filtro_clientes))
    }

    // Atualizar status da campanha para "enviando"
    await executeQuery(`
      UPDATE campanhas_envio_massa 
      SET 
        status = 'enviando',
        data_inicio = NOW()
      WHERE id = ?
    `, [campanhaId])

    // Iniciar processo de envio em background
    // Por enquanto, vamos apenas marcar como iniciado
    // Na próxima etapa implementaremos o motor de envio real

    return NextResponse.json({
      success: true,
      message: "Campanha iniciada com sucesso",
      campanha_id: campanhaId,
      status: "enviando",
      total_clientes: campanhaData.total_clientes
    })

  } catch (error) {
    console.error("Erro ao iniciar campanha:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// Função auxiliar para criar registros de detalhes (reutilizada)
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