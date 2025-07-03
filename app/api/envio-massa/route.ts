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

    // Buscar campanhas recentes
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
        c.data_conclusao,
        mt.nome as template_nome,
        ei.nome as instancia_nome
      FROM campanhas_envio_massa c
      LEFT JOIN message_templates mt ON c.template_id = mt.id
      LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
      ORDER BY c.data_criacao DESC
      LIMIT 10
    `) as any[]

    return NextResponse.json({ 
      campanhas: campanhas || [],
      success: true 
    })

  } catch (error) {
    console.error("Erro ao buscar campanhas:", error)
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

    const dados = await request.json()
    console.log("Dados recebidos:", dados)
    
    const {
      nome,
      template_id,
      instancia_id,
      filtro_clientes,
      intervalo_segundos,
      agendamento,
      data_agendamento
    } = dados

    // Validar dados obrigatórios
    console.log("Validando campos:", { nome, template_id, instancia_id })
    if (!nome || !template_id || !instancia_id) {
      return NextResponse.json({ 
        error: "Campos obrigatórios: nome, template_id, instancia_id" 
      }, { status: 400 })
    }

    // Validar agendamento
    if (agendamento === 'agendado') {
      if (!data_agendamento) {
        return NextResponse.json({ 
          error: "Data de agendamento é obrigatória para campanhas agendadas" 
        }, { status: 400 })
      }

      const dataAgendamento = new Date(data_agendamento)
      if (dataAgendamento <= new Date()) {
        return NextResponse.json({ 
          error: "Data de agendamento deve ser no futuro" 
        }, { status: 400 })
      }
    }

    // Contar total de clientes baseado no filtro
    console.log("Contando clientes com filtro:", filtro_clientes)
    const totalClientes = await contarClientesPorFiltro(filtro_clientes)
    console.log("Total de clientes encontrados:", totalClientes)

    // Inserir campanha no banco
    const resultado = await executeQuery(`
      INSERT INTO campanhas_envio_massa (
        nome,
        template_id,
        instancia_id,
        filtro_clientes,
        intervalo_segundos,
        status,
        total_clientes,
        created_by,
        data_agendamento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nome,
      template_id,
      instancia_id,
      JSON.stringify(filtro_clientes),
      intervalo_segundos || 10,
      agendamento === 'agendado' ? 'agendada' : 'rascunho',
      totalClientes,
      user.id,
      agendamento === 'agendado' ? data_agendamento : null
    ]) as any

    const campanhaId = resultado.insertId

    // Se for envio imediato, criar registros de detalhes
    if (agendamento !== 'agendado') {
      await criarDetalhesEnvio(campanhaId, filtro_clientes)
    }

    return NextResponse.json({ 
      success: true,
      campanha_id: campanhaId,
      message: agendamento === 'agendado' 
        ? "Campanha agendada com sucesso" 
        : "Campanha criada com sucesso",
      total_clientes: totalClientes
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