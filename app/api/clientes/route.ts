import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser, hashPassword } from "@/lib/auth"
import { updateExpiredClients } from "@/lib/auto-update-clients"
import { RowDataPacket, OkPacket } from "mysql2"

export async function GET(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Atualizar automaticamente clientes vencidos antes de buscar dados
    await updateExpiredClients()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const servidor = searchParams.get("servidor") || ""
    const status = searchParams.get("status") || ""
    const vencimento = searchParams.get("vencimento") || ""
    const offset = (page - 1) * limit

    // Construir filtros dinâmicos
    let whereConditions: string[] = []
    let queryParams: any[] = []

    if (search) {
      whereConditions.push("(c.nome LIKE ? OR c.whatsapp LIKE ?)")
      queryParams.push(`%${search}%`, `%${search}%`)
    }

    if (servidor && servidor !== "all") {
      whereConditions.push("s.nome = ?")
      queryParams.push(servidor)
    }

    if (status && status !== "all") {
      whereConditions.push("c.status = ?")
      queryParams.push(status)
    }

    // Filtros de vencimento
    if (vencimento && vencimento !== "all") {
      switch (vencimento) {
        case "vencendo_hoje":
          whereConditions.push("DATE(c.data_vencimento) = CURDATE()")
          break
        case "vencido":
          whereConditions.push("DATE(c.data_vencimento) < CURDATE()")
          break
        case "vencendo_proximos_dias":
          whereConditions.push("DATE(c.data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)")
          break
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // Query otimizada para contar total com filtros
    const totalQuery = `
      SELECT COUNT(*) as total 
      FROM clientes c 
      JOIN planos p ON c.plano_id = p.id 
      JOIN servidores s ON c.servidor_id = s.id 
      ${whereClause}
    `
    
    const totalClientesResult = await executeQuery(totalQuery, queryParams)
    let totalClientes = 0
    if (Array.isArray(totalClientesResult)) {
      const rows: RowDataPacket[] = totalClientesResult
      totalClientes = rows[0].total
    } else {
      console.error("Unexpected OkPacket for SELECT COUNT(*) query:", totalClientesResult)
      return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 })
    }

    const totalPages = Math.ceil(totalClientes / limit)

    // Query principal com filtros e paginação
    const clientesQuery = `
      SELECT c.id, c.nome, c.whatsapp, c.data_vencimento, c.data_ativacao, c.usuario, 
             p.nome as plano, s.nome as servidor, c.status 
      FROM clientes c 
      JOIN planos p ON c.plano_id = p.id 
      JOIN servidores s ON c.servidor_id = s.id 
      ${whereClause}
      ORDER BY c.nome ASC 
      LIMIT ? OFFSET ?
    `

    const clientesResult = await executeQuery(
      clientesQuery,
      [...queryParams, limit, offset]
    )

    let clientes: RowDataPacket[] = []
    if (Array.isArray(clientesResult)) {
      clientes = clientesResult
    } else {
      console.error("Unexpected OkPacket for SELECT clientes query:", clientesResult)
      return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 })
    }

    return NextResponse.json({
      data: clientes,
      pagination: {
        totalItems: totalClientes,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar clientes:", error)
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const {
      nome,
      whatsapp,
      plano_id,
      servidor_id,
      observacoes,
      dispositivos,
      usuario,
      senha,
      data_ativacao
    } = await request.json()

    // Processar WhatsApp - adicionar código 55 se não tiver
    let whatsappProcessado = whatsapp.replace(/\D/g, '') // Remove tudo que não for número
    if (whatsappProcessado.length === 11 && !whatsappProcessado.startsWith('55')) {
      whatsappProcessado = '55' + whatsappProcessado
    }

    // Validações básicas
    if (!nome || !whatsappProcessado || !plano_id || !servidor_id || !usuario || !senha) {
      return NextResponse.json(
        { error: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      )
    }

    // Verificar se o usuário já existe
    const usuarioExistente = await executeQuery(
      "SELECT id FROM clientes WHERE usuario = ?",
      [usuario]
    )

    if (Array.isArray(usuarioExistente) && usuarioExistente.length > 0) {
      return NextResponse.json(
        { error: "Este usuário já está cadastrado" },
        { status: 400 }
      )
    }

    // Hash da senha
    const senhaHash = await hashPassword(senha)

    // Buscar duração do plano para calcular vencimento
    const planoResult = await executeQuery(
      "SELECT duracao_dias FROM planos WHERE id = ?",
      [plano_id]
    ) as RowDataPacket[]

    if (!Array.isArray(planoResult) || planoResult.length === 0) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 400 }
      )
    }

    const duracaoDias = planoResult[0].duracao_dias || 30

    // Calcular data de vencimento
    const dataAtivacao = data_ativacao ? new Date(data_ativacao) : new Date()
    const dataVencimento = new Date(dataAtivacao)
    dataVencimento.setDate(dataVencimento.getDate() + duracaoDias)

    // Inserir cliente
    const result = await executeQuery(
      `INSERT INTO clientes 
       (nome, whatsapp, plano_id, servidor_id, observacoes, dispositivos, usuario, senha, data_ativacao, data_vencimento, ultima_renovacao) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        whatsappProcessado,
        plano_id,
        servidor_id,
        observacoes,
        dispositivos,
        usuario,
        senhaHash,
        dataAtivacao.toISOString().split('T')[0],
        dataVencimento.toISOString().split('T')[0],
        dataAtivacao.toISOString().split('T')[0]
      ]
    )

    if (Array.isArray(result)) {
      return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 })
    }

    const insertResult = result as OkPacket
    return NextResponse.json({ 
      message: "Cliente criado com sucesso", 
      id: insertResult.insertId 
    })

  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Lista de IDs inválida" },
        { status: 400 }
      )
    }

    // Excluir múltiplos clientes
    const placeholders = ids.map(() => "?").join(",")
    await executeQuery(
      `DELETE FROM clientes WHERE id IN (${placeholders})`,
      ids
    )

    return NextResponse.json({ 
      message: `${ids.length} cliente(s) excluído(s) com sucesso` 
    })

  } catch (error) {
    console.error("Erro ao excluir clientes:", error)
    return NextResponse.json({ error: "Erro ao excluir clientes" }, { status: 500 })
  }
}
