import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Executar consultas para diferentes filtros
    const [
      totalClientes,
      clientesAtivos,
      clientesInativos,
      clientesVencidos,
      clientesProximosVencimento,
      planos
    ] = await Promise.all([
      // Total de clientes
      executeQuery("SELECT COUNT(*) as total FROM clientes"),
      
      // Clientes ativos
      executeQuery("SELECT COUNT(*) as total FROM clientes WHERE status = 'ativo'"),
      
      // Clientes inativos
      executeQuery("SELECT COUNT(*) as total FROM clientes WHERE status = 'inativo'"),
      
      // Clientes vencidos
      executeQuery("SELECT COUNT(*) as total FROM clientes WHERE data_vencimento < CURDATE()"),
      
      // Clientes próximos ao vencimento (próximos 7 dias)
      executeQuery("SELECT COUNT(*) as total FROM clientes WHERE data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)"),
      
      // Lista de planos para filtro personalizado
      executeQuery("SELECT p.id, p.nome, COUNT(c.id) as total_clientes FROM planos p LEFT JOIN clientes c ON p.id = c.plano_id GROUP BY p.id, p.nome ORDER BY p.nome")
    ])

    const filtros = {
      todos: {
        nome: "Todos os Clientes",
        total: (totalClientes as any[])[0]?.total || 0,
        filtro: {}
      },
      ativos: {
        nome: "Clientes Ativos",
        total: (clientesAtivos as any[])[0]?.total || 0,
        filtro: { status: 'ativo' }
      },
      inativos: {
        nome: "Clientes Inativos", 
        total: (clientesInativos as any[])[0]?.total || 0,
        filtro: { status: 'inativo' }
      },
      vencidos: {
        nome: "Clientes Vencidos",
        total: (clientesVencidos as any[])[0]?.total || 0,
        filtro: { vencidos: true }
      },
      proximos_vencimento: {
        nome: "Próximos ao Vencimento",
        total: (clientesProximosVencimento as any[])[0]?.total || 0,
        filtro: { proximos_vencimento: true }
      },
      por_plano: (planos || []).map((plano: any) => ({
        id: plano.id,
        nome: `Plano: ${plano.nome}`,
        total: plano.total_clientes || 0,
        filtro: { plano_id: plano.id }
      }))
    }

    return NextResponse.json({
      filtros,
      success: true
    })

  } catch (error) {
    console.error("Erro ao buscar filtros de clientes:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST - Contar clientes por filtro específico
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { filtros } = await request.json()

    // Construir WHERE clause dinamicamente
    let whereClause = "WHERE 1=1"
    const params: any[] = []

    if (filtros.status) {
      whereClause += " AND status = ?"
      params.push(filtros.status)
    }

    if (filtros.vencidos === true) {
      whereClause += " AND data_vencimento < CURDATE()"
    } else if (filtros.vencidos === false) {
      whereClause += " AND data_vencimento >= CURDATE()"
    }

    if (filtros.proximos_vencimento === true) {
      whereClause += " AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)"
    }

    if (filtros.plano_id) {
      whereClause += " AND plano_id = ?"
      params.push(filtros.plano_id)
    }

    const query = `SELECT COUNT(*) as total FROM clientes ${whereClause}`
    const resultado = await executeQuery(query, params) as any[]

    return NextResponse.json({
      total: resultado[0]?.total || 0,
      filtros_aplicados: filtros,
      success: true
    })

  } catch (error) {
    console.error("Erro ao contar clientes por filtro:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 