import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"
import { EvolutionAPIService } from "@/lib/evolution-api"

const evolutionAPI = new EvolutionAPIService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const campanhaId = parseInt(id)
    
    if (!campanhaId || isNaN(campanhaId)) {
      return NextResponse.json({ 
        error: "ID da campanha inválido" 
      }, { status: 400 })
    }

    // Verificar se a campanha existe e está no status correto
    const campanha = await executeQuery(`
      SELECT 
        c.id,
        c.nome,
        c.status,
        c.template_id,
        c.instancia_id,
        c.filtro_clientes,
        c.intervalo_segundos,
        c.total_clientes,
        c.agendamento,
        mt.mensagem as template_conteudo,
        mt.message_type,
        ei.instance_name,
        ei.status as instancia_status
      FROM campanhas_envio_massa c
      LEFT JOIN message_templates mt ON c.template_id = mt.id
      LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
      WHERE c.id = ?
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
    if (!['conectada', 'connected'].includes(campanhaData.instancia_status)) {
      return NextResponse.json({ 
        error: `Instância WhatsApp não está conectada. Status: ${campanhaData.instancia_status}` 
      }, { status: 400 })
    }

    // Verificar se o template existe
    if (!campanhaData.template_conteudo) {
      return NextResponse.json({ 
        error: "Template de mensagem não encontrado" 
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
      try {
        // Garantir que o filtro_clientes seja um JSON válido
        const filtrosJson = typeof campanhaData.filtro_clientes === 'string' 
          ? JSON.parse(campanhaData.filtro_clientes)
          : campanhaData.filtro_clientes

        await criarDetalhesEnvio(campanhaId, filtrosJson)
      } catch (error) {
        console.error("Erro ao criar detalhes de envio:", error)
        return NextResponse.json({ 
          error: "Erro ao processar filtros de clientes" 
        }, { status: 400 })
      }
    }

    // Atualizar status da campanha para "enviando"
    await executeQuery(`
      UPDATE campanhas_envio_massa 
      SET 
        status = 'enviando',
        data_inicio = NOW()
      WHERE id = ?
    `, [campanhaId])

    // Se a campanha não tem agendamento, processar imediatamente
    if (!campanhaData.agendamento) {
      console.log(`🚀 Iniciando processamento imediato da campanha ${campanhaData.nome}`)
      
      // Processar em background
      processarEnviosImediatos(campanhaData).catch(error => {
        console.error(`❌ Erro no processamento imediato da campanha ${campanhaId}:`, error)
        // Em caso de erro, marcar a campanha como erro
        executeQuery(`
          UPDATE campanhas_envio_massa 
          SET 
            status = 'erro',
            erro_detalhes = ?
          WHERE id = ?
        `, [String(error), campanhaId]).catch(console.error)
      })
    }

    return NextResponse.json({
      success: true,
      message: campanhaData.agendamento 
        ? "Campanha agendada iniciada com sucesso" 
        : "Campanha iniciada com sucesso, processando envios",
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

  // Verificar se existem clientes que atendem aos filtros
  const clientesCount = await executeQuery(`
    SELECT COUNT(*) as total FROM clientes ${whereClause}
  `, params) as any[]

  if (!clientesCount || !clientesCount[0] || clientesCount[0].total === 0) {
    throw new Error("Nenhum cliente encontrado com os filtros selecionados")
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

// Função para processar envios imediatos
async function processarEnviosImediatos(campanha: any) {
  try {
    while (true) {
      // Buscar próximo lote de envios pendentes
      const envios = await executeQuery(`
        SELECT 
          emd.id,
          emd.cliente_id,
          c.nome as cliente_nome,
          c.whatsapp as cliente_telefone,
          c.data_vencimento,
          p.nome as plano_nome
        FROM envios_massa_detalhes emd
        LEFT JOIN clientes c ON emd.cliente_id = c.id
        LEFT JOIN planos p ON c.plano_id = p.id
        WHERE emd.campanha_id = ? AND emd.status = 'pendente'
        ORDER BY emd.id ASC
        LIMIT 10
      `, [campanha.id]) as any[]

      if (!envios || envios.length === 0) {
        console.log(`✅ Campanha ${campanha.id} concluída - todos os envios processados`)
        await executeQuery(`
          UPDATE campanhas_envio_massa 
          SET 
            status = 'concluida',
            data_conclusao = NOW()
          WHERE id = ?
        `, [campanha.id])
        break
      }

      console.log(`📱 Processando ${envios.length} envios pendentes`)

      for (const envio of envios) {
        try {
          if (!envio.cliente_telefone) {
            throw new Error(`Cliente ${envio.cliente_nome} não possui número de WhatsApp cadastrado`)
          }

          // Personalizar mensagem
          const mensagem = personalizarMensagem(
            campanha.template_conteudo,
            {
              nome: envio.cliente_nome,
              telefone: envio.cliente_telefone,
              vencimento: envio.data_vencimento,
              plano: envio.plano_nome
            }
          )

          console.log(`📤 Enviando mensagem para ${envio.cliente_nome} (${envio.cliente_telefone})`)

          // Enviar mensagem
          const resultado = await evolutionAPI.sendTextMessage(
            campanha.instance_name,
            envio.cliente_telefone,
            mensagem
          )

          // Atualizar status do envio
          await executeQuery(`
            UPDATE envios_massa_detalhes 
            SET 
              status = 'enviado',
              mensagem_enviada = ?,
              data_envio = NOW()
            WHERE id = ?
          `, [mensagem, envio.id])

          // Atualizar contadores da campanha
          await executeQuery(`
            UPDATE campanhas_envio_massa 
            SET 
              enviados = enviados + 1,
              sucessos = sucessos + 1
            WHERE id = ?
          `, [campanha.id])

          console.log(`✅ Mensagem enviada com sucesso para ${envio.cliente_telefone}`)

          // Aguardar intervalo configurado
          if (campanha.intervalo_segundos > 0) {
            await new Promise(resolve => setTimeout(resolve, campanha.intervalo_segundos * 1000))
          }

        } catch (error) {
          console.error(`❌ Erro ao processar envio ${envio.id}:`, error)

          // Marcar envio como erro
          await executeQuery(`
            UPDATE envios_massa_detalhes 
            SET 
              status = 'erro',
              erro_detalhes = ?,
              tentativas = tentativas + 1
            WHERE id = ?
          `, [String(error), envio.id])

          // Atualizar contadores da campanha
          await executeQuery(`
            UPDATE campanhas_envio_massa 
            SET 
              enviados = enviados + 1,
              falhas = falhas + 1
            WHERE id = ?
          `, [campanha.id])
        }
      }
    }
  } catch (error) {
    console.error(`❌ Erro no processamento da campanha ${campanha.id}:`, error)
    // Marcar campanha como erro
    await executeQuery(`
      UPDATE campanhas_envio_massa 
      SET 
        status = 'erro',
        erro_detalhes = ?
      WHERE id = ?
    `, [String(error), campanha.id])
  }
}

function personalizarMensagem(template: string, dados: any): string {
  let mensagem = template

  // Substituir variáveis
  Object.entries(dados).forEach(([chave, valor]) => {
    mensagem = mensagem.replace(
      new RegExp(`{${chave}}`, 'g'), 
      String(valor || '')
    )
  })

  return mensagem
} 