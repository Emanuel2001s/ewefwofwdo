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
        ei.instance_name as instancia_nome,
        (
          SELECT COUNT(*)
          FROM envios_massa_detalhes
          WHERE campanha_id = c.id
            AND status IN ('enviado', 'entregue', 'lido')
        ) as sucessos,
        (
          SELECT COUNT(*)
          FROM envios_massa_detalhes
          WHERE campanha_id = c.id
            AND status = 'erro'
        ) as falhas
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

    let body
    try {
      body = await request.json()
      console.log("📦 Dados recebidos:", body)
    } catch (e) {
      console.error("❌ Erro ao parsear JSON do request:", e)
      return NextResponse.json({ 
        error: "Dados inválidos" 
      }, { status: 400 })
    }

    const {
      nome,
      template_id,
      instancia_id,
      filtro_clientes,
      intervalo_segundos,
      data_agendamento,
      descricao
    } = body

    console.log("🔍 Validando campos...")

    // Validar campos obrigatórios
    if (!nome?.trim()) {
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
        error: "Filtro de clientes é obrigatório" 
      }, { status: 400 })
    }

    if (!intervalo_segundos || intervalo_segundos < 1) {
      return NextResponse.json({ 
        error: "Intervalo entre mensagens deve ser maior que 0" 
      }, { status: 400 })
    }

    console.log("✅ Campos básicos validados")
    console.log("🔍 Validando template...")

    // Validar se template existe
    const templateExists = await executeQuery(
      "SELECT id FROM message_templates WHERE id = ?",
      [template_id]
    ) as any[]

    if (!templateExists.length) {
      return NextResponse.json({ 
        error: "Template não encontrado" 
      }, { status: 404 })
    }

    console.log("✅ Template validado")
    console.log("🔍 Validando instância...")

    // Validar se instância existe e está conectada
    const instanciaExists = await executeQuery(
      "SELECT id, status FROM evolution_instancias WHERE id = ?",
      [instancia_id]
    ) as any[]

    if (!instanciaExists.length) {
      return NextResponse.json({ 
        error: "Instância não encontrada" 
      }, { status: 404 })
    }

    if (instanciaExists[0].status !== 'conectada' && instanciaExists[0].status !== 'connected') {
      return NextResponse.json({ 
        error: "Instância não está conectada" 
      }, { status: 400 })
    }

    console.log("✅ Instância validada")

    // Validar data de agendamento
    if (data_agendamento) {
      console.log("🔍 Validando data de agendamento:", data_agendamento)
      const dataAgendamento = new Date(data_agendamento)
      if (isNaN(dataAgendamento.getTime())) {
        return NextResponse.json({ 
          error: "Data de agendamento inválida" 
        }, { status: 400 })
      }
      console.log("✅ Data de agendamento validada")
    }

    console.log("💾 Inserindo campanha no banco de dados...")

    // Preparar campos e valores para a query
    const campos = [
      'nome',
      'template_id',
      'instancia_id',
      'filtro_clientes',
      'intervalo_segundos',
      'status',
      'data_agendamento',
      'created_by'
    ]

    const valores = [
      nome.trim(),
      template_id,
      instancia_id,
      JSON.stringify(filtro_clientes),
      intervalo_segundos,
      data_agendamento ? 'agendada' : 'rascunho',
      data_agendamento || null,
      user.id
    ]

    // Adicionar campo descricao apenas se foi fornecido
    if (descricao?.trim()) {
      campos.push('descricao')
      valores.push(descricao.trim())
    }

    const query = `
      INSERT INTO campanhas_envio_massa (
        ${campos.join(', ')}
      ) VALUES (${campos.map(() => '?').join(', ')})
    `

    console.log("📝 Query:", query)
    console.log("📝 Valores:", valores)

    const result = await executeQuery(query, valores) as any

    if (!result.insertId) {
      console.error("❌ Falha ao inserir campanha - sem insertId")
      throw new Error("Falha ao inserir campanha no banco de dados")
    }

    const campanhaId = result.insertId
    console.log("✅ Campanha inserida com sucesso - ID:", campanhaId)

    // Criar detalhes de envio para cada cliente
    console.log("📝 Criando detalhes de envio...")
    let whereClause = "WHERE 1=1"
    const whereParams: any[] = []

    if (filtro_clientes.status) {
      whereClause += " AND status = ?"
      whereParams.push(filtro_clientes.status)
    }

    if (filtro_clientes.vencidos === true) {
      whereClause += " AND data_vencimento < CURDATE()"
    }

    if (filtro_clientes.proximos_vencimento === true) {
      whereClause += " AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)"
    }

    if (filtro_clientes.plano_id) {
      whereClause += " AND plano_id = ?"
      whereParams.push(filtro_clientes.plano_id)
    }

    // Buscar clientes que atendem aos filtros
    const clientes = await executeQuery(`
      SELECT id, nome, whatsapp 
      FROM clientes 
      ${whereClause}
    `, whereParams) as any[]

    console.log(`📝 Encontrados ${clientes.length} clientes para envio`)

    // Atualizar total de clientes na campanha
    await executeQuery(`
      UPDATE campanhas_envio_massa 
      SET total_clientes = ?
      WHERE id = ?
    `, [clientes.length, campanhaId])

    console.log("✅ Detalhes de envio criados com sucesso")

    // Criar detalhes de envio para cada cliente
    for (const cliente of clientes) {
      await executeQuery(`
        INSERT INTO envios_massa_detalhes (
          campanha_id,
          cliente_id,
          whatsapp,
          status,
          tentativas
        ) VALUES (?, ?, ?, 'pendente', 0)
      `, [campanhaId, cliente.id, cliente.whatsapp || ''])
    }

    return NextResponse.json({
      success: true,
      message: data_agendamento
        ? "Campanha criada e agendada com sucesso"
        : "Campanha criada com sucesso",
      id: campanhaId,
      total_clientes: clientes.length
    })

  } catch (error: any) {
    console.error("❌ Erro ao criar campanha:", error)
    console.error("Stack trace:", error.stack)
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
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
    SELECT id, whatsapp FROM clientes ${whereClause}
  `, params) as any[]

  // Inserir registros de detalhes para cada cliente
  for (const cliente of clientes) {
    await executeQuery(`
      INSERT INTO envios_massa_detalhes (
        campanha_id,
        cliente_id,
        whatsapp,
        status
      ) VALUES (?, ?, ?, 'pendente')
    `, [campanhaId, cliente.id, cliente.whatsapp || ''])
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