import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { campanhaId } = await request.json()

    if (!campanhaId) {
      return NextResponse.json({ error: "ID da campanha é obrigatório" }, { status: 400 })
    }

    // Verificar se a campanha existe e está em estado válido
    const campanha = await executeQuery(`
      SELECT 
        c.id,
        c.nome,
        c.status,
        c.total_clientes,
        c.enviados,
        ei.instance_name,
        ei.status as instancia_status
      FROM campanhas_envio_massa c
      LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
      WHERE c.id = ?
    `, [campanhaId]) as any[]

    if (!campanha.length) {
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 })
    }

    const campanhaData = campanha[0]

    // Verificar status da instância
    const instanciaConectada = ['conectada', 'connected'].includes(campanhaData.instancia_status)

    // Buscar detalhes dos envios
    const enviosPendentes = await executeQuery(`
      SELECT 
        emd.id,
        emd.cliente_id,
        emd.whatsapp,
        emd.status,
        c.nome as cliente_nome
      FROM envios_massa_detalhes emd
      LEFT JOIN clientes c ON emd.cliente_id = c.id
      WHERE emd.campanha_id = ?
      ORDER BY emd.status, emd.id
      LIMIT 10
    `, [campanhaId]) as any[]

    // Contar status dos envios
    const statusCount = await executeQuery(`
      SELECT 
        status,
        COUNT(*) as total
      FROM envios_massa_detalhes
      WHERE campanha_id = ?
      GROUP BY status
    `, [campanhaId]) as any[]

    return NextResponse.json({
      success: true,
      campanha: {
        id: campanhaData.id,
        nome: campanhaData.nome,
        status: campanhaData.status,
        total_clientes: campanhaData.total_clientes,
        enviados: campanhaData.enviados,
        instancia: campanhaData.instance_name,
        instancia_conectada: instanciaConectada,
        instancia_status: campanhaData.instancia_status
      },
      envios: {
        detalhes: enviosPendentes,
        status_count: statusCount
      }
    })

  } catch (error: any) {
    console.error("Erro ao testar envio:", error)
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// GET - Listar todas as campanhas para debug
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const campanhas = await executeQuery(`
      SELECT 
        c.id,
        c.nome,
        c.status,
        c.total_clientes,
        c.enviados,
        c.sucessos,
        c.falhas,
        c.data_criacao,
        c.data_inicio,
        ei.instance_name,
        ei.status as instancia_status,
        mt.nome as template_nome
      FROM campanhas_envio_massa c
      LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
      LEFT JOIN message_templates mt ON c.template_id = mt.id
      ORDER BY c.id DESC
      LIMIT 10
    `) as any[]

    return NextResponse.json({
      success: true,
      campanhas
    })

  } catch (error: any) {
    console.error("Erro ao listar campanhas:", error)
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 