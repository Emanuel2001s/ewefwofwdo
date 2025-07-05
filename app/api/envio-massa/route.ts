import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

// GET - Listar campanhas recentes
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Buscar total de registros
    const totalResult = await executeQuery(`
      SELECT COUNT(*) as total FROM campanhas_envio_massa
    `) as any[]

    const total = totalResult[0].total

    // Buscar campanhas com paginação
    const campanhas = await executeQuery(`
      SELECT 
        c.*,
        mt.nome as template_nome,
        ei.instance_name as instancia_nome
      FROM campanhas_envio_massa c
      LEFT JOIN message_templates mt ON c.template_id = mt.id
      LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
      ORDER BY c.id DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]) as any[]

    return NextResponse.json({
      success: true,
      data: campanhas,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current_page: page,
        per_page: limit
      }
    })

  } catch (error) {
    console.error("Erro ao listar campanhas:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST - Criar nova campanha
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const {
      nome,
      template_id,
      instancia_id,
      filtro_clientes,
      intervalo_segundos,
      data_agendamento
    } = body

    // Validar campos obrigatórios
    if (!nome) {
      return NextResponse.json({ 
        error: "Nome da campanha é obrigatório" 
      }, { status: 400 })
    }

    if (!template_id) {
      return NextResponse.json({ 
        error: "Template é obrigatório" 
      }, { status: 400 })
    }

    if (!instancia_id) {
      return NextResponse.json({ 
        error: "Instância é obrigatória" 
      }, { status: 400 })
    }

    if (!filtro_clientes) {
      return NextResponse.json({ 
        error: "Filtros de clientes são obrigatórios" 
      }, { status: 400 })
    }

    if (!intervalo_segundos || intervalo_segundos < 0) {
      return NextResponse.json({ 
        error: "Intervalo entre envios é obrigatório e deve ser maior ou igual a 0" 
      }, { status: 400 })
    }

    // Validar data de agendamento se fornecida
    if (data_agendamento) {
      const dataAgendamento = new Date(data_agendamento)
      if (dataAgendamento <= new Date()) {
        return NextResponse.json({ 
          error: "Data de agendamento deve ser no futuro" 
        }, { status: 400 })
      }
    }

    // Criar campanha
    const result = await executeQuery(`
      INSERT INTO campanhas_envio_massa (
        nome,
        template_id,
        instancia_id,
        filtro_clientes,
        intervalo_segundos,
        status,
        data_agendamento,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nome,
      template_id,
      instancia_id,
      JSON.stringify(filtro_clientes),
      intervalo_segundos,
      data_agendamento ? 'agendada' : 'rascunho',
      data_agendamento,
      user.id
    ]) as any

    return NextResponse.json({
      success: true,
      message: data_agendamento
        ? "Campanha criada e agendada com sucesso"
        : "Campanha criada com sucesso",
      id: result.insertId
    })

  } catch (error) {
    console.error("Erro ao criar campanha:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// Função auxiliar para contar clientes por filtro
async function contarClientesPorFiltro(filtro: any): Promise<number> {
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

  const query = `SELECT COUNT(*) as total FROM clientes ${whereClause}`
  const resultado = await executeQuery(query, params) as any[]
  
  return resultado[0]?.total || 0
}

// Função auxiliar para criar registros de detalhes
async function criarDetalhesEnvio(campanhaId: number, filtro: any): Promise<void> {
  // Buscar clientes baseado no filtro
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

// PUT - Atualizar campanha existente
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "ID da campanha é obrigatório" },
        { status: 400 }
      )
    }

    // Construir query de atualização dinamicamente
    const updateFields: string[] = []
    const updateValues: any[] = []

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`)
        updateValues.push(typeof value === 'object' ? JSON.stringify(value) : value)
      }
    })

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      )
    }

    const updateQuery = `
      UPDATE campanhas_envio_massa 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `

    updateValues.push(id)

    const updateResult = await fetch('/api/mysql-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: updateQuery,
        params: updateValues
      })
    }).then(res => res.json())

    if (!updateResult.success) {
      throw new Error("Erro ao atualizar campanha")
    }

    return NextResponse.json({
      success: true,
      message: "Campanha atualizada com sucesso"
    })

  } catch (error) {
    console.error("Erro ao atualizar campanha:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 