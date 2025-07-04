import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

// Rota para obter detalhes de uma campanha específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const campanhaId = parseInt(params.id)

    if (!campanhaId || isNaN(campanhaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // Buscar detalhes da campanha
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

    if (!campanhaResult || campanhaResult.length === 0) {
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })
    }

    const campanha = campanhaResult[0]

    // Buscar detalhes dos envios
    const envios = await executeQuery(`
      SELECT 
        e.*,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone
      FROM envios_massa_detalhes e
      LEFT JOIN clientes c ON e.cliente_id = c.id
      WHERE e.campanha_id = ?
      ORDER BY e.data_envio DESC
    `, [campanhaId])

    return NextResponse.json({ campanha, envios })
  } catch (error) {
    console.error("Erro ao buscar detalhes da campanha:", error)
    return NextResponse.json(
      { error: "Erro ao buscar detalhes da campanha" },
      { status: 500 }
    )
  }
}

// Rota para excluir uma campanha
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const campanhaId = parseInt(params.id)

    if (!campanhaId || isNaN(campanhaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // Verificar se a campanha existe e não está em andamento
    const campanhaResult = await executeQuery(
      "SELECT status FROM campanhas_envio_massa WHERE id = ?",
      [campanhaId]
    ) as any[]

    if (!campanhaResult || campanhaResult.length === 0) {
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })
    }

    const campanha = campanhaResult[0]

    if (campanha.status === "enviando") {
      return NextResponse.json(
        { error: "Não é possível excluir uma campanha em andamento" },
        { status: 400 }
      )
    }

    // Excluir os detalhes dos envios primeiro (devido à foreign key)
    await executeQuery(
      "DELETE FROM envios_massa_detalhes WHERE campanha_id = ?",
      [campanhaId]
    )

    // Excluir a campanha
    await executeQuery(
      "DELETE FROM campanhas_envio_massa WHERE id = ?",
      [campanhaId]
    )

    return NextResponse.json({ message: "Campanha excluída com sucesso" })
  } catch (error) {
    console.error("Erro ao excluir campanha:", error)
    return NextResponse.json(
      { error: "Erro ao excluir campanha" },
      { status: 500 }
    )
  }
} 