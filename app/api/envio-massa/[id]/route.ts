import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

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

    const { id } = context.params
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
        ei.status as instancia_status
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

    const campanha = campanhaResult[0]

    // Buscar detalhes dos envios
    console.log(`🔍 [DEBUG API] Buscando envios da campanha ${campanhaId}`)
    const envios = await executeQuery(`
      SELECT 
        e.*,
        c.nome as cliente_nome,
        c.whatsapp as cliente_telefone
      FROM envios_massa_detalhes e
      LEFT JOIN clientes c ON e.cliente_id = c.id
      WHERE e.campanha_id = ?
      ORDER BY e.created_at DESC
    `, [campanhaId]) as any[]

    console.log(`✅ [DEBUG API] Envios encontrados: ${envios.length}`)

    // Mapear os campos para o formato esperado pelo frontend
    const enviosMapeados = envios.map(envio => ({
      id: envio.id,
      cliente_id: envio.cliente_id,
      cliente_nome: envio.cliente_nome,
      cliente_telefone: envio.cliente_telefone || '-',
      status: envio.status,
      data_criacao: envio.created_at,
      data_atualizacao: envio.updated_at,
      mensagem: envio.mensagem_enviada,
      resposta: envio.erro_mensagem
    }))

    return NextResponse.json({ 
      campanha,
      envios: enviosMapeados,
      debug: {
        id_recebido: id,
        id_convertido: campanhaId,
        total_envios: envios.length
      }
    })
  } catch (error) {
    console.error("❌ [DEBUG API] Erro ao buscar detalhes da campanha:", error)
    return NextResponse.json(
      { 
        error: "Erro ao buscar detalhes da campanha",
        debug: error instanceof Error ? error.message : String(error)
      },
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
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = context.params
    console.log(`🔍 [DEBUG API] ID recebido para exclusão: "${id}"`)
    
    const campanhaId = parseInt(id)
    console.log(`🔍 [DEBUG API] ID convertido: ${campanhaId}`)

    if (!campanhaId || isNaN(campanhaId)) {
      console.log(`❌ [DEBUG API] ID inválido: "${id}"`)
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // Verificar se a campanha existe e não está em andamento
    console.log(`🔍 [DEBUG API] Verificando status da campanha ${campanhaId}`)
    const campanhaResult = await executeQuery(
      "SELECT status FROM campanhas_envio_massa WHERE id = ?",
      [campanhaId]
    ) as any[]

    if (!campanhaResult || campanhaResult.length === 0) {
      console.log(`❌ [DEBUG API] Campanha não encontrada para exclusão: ${campanhaId}`)
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })
    }

    const campanha = campanhaResult[0]

    if (campanha.status === "enviando") {
      console.log(`❌ [DEBUG API] Tentativa de excluir campanha em andamento: ${campanhaId}`)
      return NextResponse.json(
        { error: "Não é possível excluir uma campanha em andamento" },
        { status: 400 }
      )
    }

    // Excluir os detalhes dos envios primeiro (devido à foreign key)
    console.log(`🔍 [DEBUG API] Excluindo envios da campanha ${campanhaId}`)
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
    return NextResponse.json({ message: "Campanha excluída com sucesso" })
  } catch (error) {
    console.error("❌ [DEBUG API] Erro ao excluir campanha:", error)
    return NextResponse.json(
      { error: "Erro ao excluir campanha" },
      { status: 500 }
    )
  }
} 