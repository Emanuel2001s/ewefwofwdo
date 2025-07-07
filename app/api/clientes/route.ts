import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser, hashPassword } from "@/lib/auth"
import { updateExpiredClients } from "@/lib/auto-update-clients"
import { RowDataPacket, OkPacket } from "mysql2"
import { formatPhoneNumber } from "@/lib/phone-utils"

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

    try {
      const whatsappProcessado = formatPhoneNumber(whatsapp)
      
      // Processar WhatsApp - adicionar código 55 apenas se necessário
      let whatsappProcessadoFormatted = whatsappProcessado.replace(/\D/g, '') // Remove tudo que não for número
      
      // Remover 0 inicial se houver
      if (whatsappProcessadoFormatted.startsWith('0')) {
        whatsappProcessadoFormatted = whatsappProcessadoFormatted.substring(1)
      }
      
      // CORREÇÃO: Verificar se já tem código do país 55 para evitar duplicação
      // Se tem 13 dígitos e começa com 55, já está formatado corretamente
      // Se tem 11 dígitos e não começa com 55, adicionar código do país
      if (whatsappProcessadoFormatted.length === 11 && !whatsappProcessadoFormatted.startsWith('55')) {
        whatsappProcessadoFormatted = '55' + whatsappProcessadoFormatted
      } else if (whatsappProcessadoFormatted.length === 13 && whatsappProcessadoFormatted.startsWith('55')) {
        // Já está formatado corretamente, não fazer nada
        console.log(`Número já formatado com código do país: ${whatsappProcessadoFormatted}`)
      } else if (whatsappProcessadoFormatted.length === 12 && !whatsappProcessadoFormatted.startsWith('55')) {
        // Caso especial: número com 12 dígitos sem código do país
        whatsappProcessadoFormatted = '55' + whatsappProcessadoFormatted
      }
      
      // Validar tamanho final (12 ou 13 dígitos)
      if (whatsappProcessadoFormatted.length < 12 || whatsappProcessadoFormatted.length > 13) {
        return NextResponse.json(
          { error: `Número de WhatsApp inválido: ${whatsapp} (formatado: ${whatsappProcessadoFormatted}). Use o formato (99) 99999-9999` },
          { status: 400 }
        )
      }
      
      console.log(`API Clientes - Número original: ${whatsapp}, formatado: ${whatsappProcessadoFormatted}`)

      // Validações básicas
      if (!nome || !whatsappProcessadoFormatted || !plano_id || !servidor_id || !usuario || !senha) {
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
          whatsappProcessadoFormatted,
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
      console.error("Erro ao formatar número de WhatsApp:", error)
      return NextResponse.json({ error: "Erro ao formatar número de WhatsApp" }, { status: 500 })
    }

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

    // Verificar se todos os IDs são válidos
    const placeholders = ids.map(() => "?").join(",")
    const clientesExistentes = await executeQuery(
      `SELECT id FROM clientes WHERE id IN (${placeholders})`,
      ids
    ) as RowDataPacket[]

    if (clientesExistentes.length !== ids.length) {
      return NextResponse.json(
        { error: "Um ou mais clientes não foram encontrados" },
        { status: 404 }
      )
    }

    // Primeiro, excluir registros relacionados na tabela envios_massa_detalhes
    // para evitar problemas de integridade referencial
    try {
      const deletedEnvios = await executeQuery(
        `DELETE FROM envios_massa_detalhes WHERE cliente_id IN (${placeholders})`,
        ids
      ) as OkPacket

      if (deletedEnvios.affectedRows > 0) {
        console.log(`${deletedEnvios.affectedRows} registros de envios em massa excluídos para ${ids.length} cliente(s)`);
      }
    } catch (error) {
      console.log(`Erro ao excluir registros de envio em massa ou nenhum registro encontrado:`, error);
      // Continua a execução mesmo se não houver registros relacionados
    }

    // Agora, excluir os clientes
    const result = await executeQuery(
      `DELETE FROM clientes WHERE id IN (${placeholders})`,
      ids
    ) as OkPacket

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Nenhum cliente foi excluído" },
        { status: 500 }
      )
    }

    if (result.affectedRows !== ids.length) {
      return NextResponse.json({ 
        message: `${result.affectedRows} de ${ids.length} cliente(s) excluído(s) com sucesso. Alguns clientes podem não ter sido encontrados.`
      })
    }

    return NextResponse.json({ 
      message: `${result.affectedRows} cliente(s) excluído(s) com sucesso` 
    })

  } catch (error) {
    console.error("Erro ao excluir clientes:", error)
    
    // Verificar se o erro é de integridade referencial
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json({ 
        error: "Não é possível excluir um ou mais clientes pois eles possuem registros relacionados no sistema" 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Erro ao excluir clientes" }, { status: 500 })
  }
}
