import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

interface EnvioMassa {
  id: number
  status: string
  data_envio: Date | null
  erro: string | null
  erro_mensagem: string | null
  campanha_id: number
  cliente_id: number
  whatsapp: string
  mensagem_enviada: string | null
  tentativas: number
  enviado_em: Date | null
  entregue_em: Date | null
  lido_em: Date | null
  created_at: Date
  message_id: string | null
  cliente_nome: string | null
}

// Rota para obter detalhes de uma campanha específica
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const params = await Promise.resolve(context.params)
    const { id } = params
    console.log(`🔍 [DEBUG API] ID recebido: "${id}"`)
    
    // Garantir que o ID é um número válido
    const campanhaId = parseInt(id)
    console.log(`🔍 [DEBUG API] ID convertido: ${campanhaId}`)

    if (!campanhaId || isNaN(campanhaId)) {
      console.log(`❌ [DEBUG API] ID inválido: "${id}"`)
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // Primeiro verificar se a campanha existe
    const campanhaExiste = await executeQuery(
      "SELECT id FROM campanhas_envio_massa WHERE id = ?",
      [campanhaId]
    ) as any[]

    if (!campanhaExiste || campanhaExiste.length === 0) {
      console.log(`❌ [DEBUG API] Campanha não encontrada para ID: ${campanhaId}`)
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })
    }

    // Buscar detalhes completos da campanha
    console.log(`🔍 [DEBUG API] Buscando detalhes da campanha ${campanhaId}`)
    const campanhaResult = await executeQuery(`
      SELECT 
        c.*,
        mt.nome as template_nome,
        mt.mensagem as template_conteudo,
        ei.nome as instancia_nome,
        ei.status as instancia_status,
        (
          SELECT COUNT(*) 
          FROM envios_massa_detalhes 
          WHERE campanha_id = c.id 
          AND status IN ('enviado', 'entregue', 'lido')
        ) as total_sucessos,
        (
          SELECT COUNT(*) 
          FROM envios_massa_detalhes 
          WHERE campanha_id = c.id 
          AND status = 'erro'
        ) as total_falhas,
        (
          SELECT COUNT(*) 
          FROM envios_massa_detalhes 
          WHERE campanha_id = c.id 
          AND status != 'pendente'
        ) as total_processados
      FROM campanhas_envio_massa c
      LEFT JOIN message_templates mt ON c.template_id = mt.id
      LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
      WHERE c.id = ?
    `, [campanhaId]) as any[]

    console.log(`🔍 [DEBUG API] Resultado da query da campanha:`, campanhaResult)

    if (!campanhaResult || campanhaResult.length === 0) {
      console.log(`❌ [DEBUG API] Erro ao buscar detalhes da campanha ${campanhaId}`)
      return NextResponse.json(
        { error: "Erro ao buscar detalhes da campanha" },
        { status: 500 }
      )
    }

    const campanha = {
      ...campanhaResult[0],
      sucessos: campanhaResult[0].total_sucessos,
      falhas: campanhaResult[0].total_falhas,
      enviados: campanhaResult[0].total_processados
    }

    // Buscar detalhes dos envios
    console.log(`🔍 [DEBUG API] Buscando detalhes dos envios da campanha ${campanhaId}`)
    const enviosResult = await executeQuery(`
      SELECT 
        e.id,
        e.status,
        e.data_envio,
        e.erro,
        e.erro_mensagem,
        e.campanha_id,
        e.cliente_id,
        e.whatsapp,
        e.mensagem_enviada,
        e.tentativas,
        e.enviado_em,
        e.entregue_em,
        e.lido_em,
        e.created_at,
        e.message_id,
        c.nome as cliente_nome
      FROM envios_massa_detalhes e
      LEFT JOIN clientes c ON e.cliente_id = c.id
      WHERE e.campanha_id = ?
      ORDER BY e.data_envio DESC
    `, [campanhaId]) as EnvioMassa[]

    console.log(`🔍 [DEBUG API] Resultado da query dos envios:`, enviosResult)

    if (!enviosResult || enviosResult.length === 0) {
      console.log(`❌ [DEBUG API] Erro ao buscar detalhes dos envios da campanha ${campanhaId}`)
      return NextResponse.json(
        { error: "Erro ao buscar detalhes dos envios da campanha" },
        { status: 500 }
      )
    }

    // Mapear os envios para incluir apenas os campos necessários
    const envios = enviosResult.map(envio => ({
      id: envio.id,
      status: envio.status,
      data_envio: envio.data_envio,
      erro: envio.erro || envio.erro_mensagem,
      whatsapp: envio.whatsapp,
      cliente_nome: envio.cliente_nome,
      mensagem_enviada: envio.mensagem_enviada,
      tentativas: envio.tentativas,
      enviado_em: envio.enviado_em,
      entregue_em: envio.entregue_em,
      lido_em: envio.lido_em,
      message_id: envio.message_id
    }))

    return NextResponse.json({ campanha, envios }, { status: 200 })
  } catch (error) {
    console.error(`❌ [DEBUG API] Erro ao buscar detalhes da campanha ${context.params.id}:`, error)
    return NextResponse.json(
      { error: "Erro ao buscar detalhes da campanha" },
      { status: 500 }
    )
  }
}

// Rota para excluir uma campanha
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const params = await Promise.resolve(context.params)
    const { id } = params
    console.log(`🔍 [DEBUG API] ID recebido para exclusão: "${id}"`)
    
    // Garantir que o ID é um número válido
    const campanhaId = parseInt(id)
    console.log(`🔍 [DEBUG API] ID convertido: ${campanhaId}`)

    if (!campanhaId || isNaN(campanhaId)) {
      console.log(`❌ [DEBUG API] ID inválido: "${id}"`)
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // Verificar se a campanha existe e seu status
    const [campanha] = await executeQuery(
      "SELECT id, status FROM campanhas_envio_massa WHERE id = ?",
      [campanhaId]
    ) as any[]

    if (!campanha) {
      console.log(`❌ [DEBUG API] Campanha não encontrada para ID: ${campanhaId}`)
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })
    }

    // Verificar se a campanha pode ser excluída
    if (campanha.status === 'enviando') {
      console.log(`❌ [DEBUG API] Tentativa de excluir campanha em andamento: ${campanhaId}`)
      return NextResponse.json({ 
        error: "Não é possível excluir uma campanha em andamento" 
      }, { status: 400 })
    }

    // Excluir os detalhes dos envios primeiro
    console.log(`🔍 [DEBUG API] Excluindo detalhes dos envios da campanha ${campanhaId}`)
    await executeQuery(
      "DELETE FROM envios_massa_detalhes WHERE campanha_id = ?",
      [campanhaId]
    )

    // Excluir a campanha
    console.log(`🔍 [DEBUG API] Excluindo campanha ${campanhaId}`)
    await executeQuery(
      "DELETE FROM campanhas_envio_massa WHERE id = ?",
      [campanhaId]
    )

    console.log(`✅ [DEBUG API] Campanha ${campanhaId} excluída com sucesso`)
    return NextResponse.json({ 
      success: true,
      message: "Campanha excluída com sucesso" 
    })

  } catch (error) {
    console.error(`❌ [DEBUG API] Erro ao excluir campanha ${context.params.id}:`, error)
    return NextResponse.json(
      { error: "Erro ao excluir campanha" },
      { status: 500 }
    )
  }
}