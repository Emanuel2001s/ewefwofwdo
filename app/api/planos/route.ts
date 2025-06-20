import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { RowDataPacket, OkPacket } from "mysql2"

export async function GET(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const totalPlanosResult = (await executeQuery("SELECT COUNT(*) as total FROM planos")) as RowDataPacket[]
    const totalPlanos = totalPlanosResult[0].total
    const totalPages = Math.ceil(totalPlanos / limit)

    const planos = await executeQuery(
      "SELECT id, nome, valor, duracao_dias FROM planos ORDER BY nome ASC LIMIT ? OFFSET ?",
      [limit, offset],
    )

    return NextResponse.json({
      data: planos,
      pagination: {
        totalItems: totalPlanos,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar planos:", error)
    return NextResponse.json({ error: "Erro ao buscar planos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { nome, valor, duracao_dias } = await request.json()

    if (!nome || nome.trim() === "") {
      return NextResponse.json({ error: "Nome do plano é obrigatório" }, { status: 400 })
    }

    if (!valor || isNaN(valor) || valor <= 0) {
      return NextResponse.json({ error: "Valor do plano deve ser maior que zero" }, { status: 400 })
    }

    if (!duracao_dias || isNaN(duracao_dias) || duracao_dias <= 0) {
      return NextResponse.json({ error: "Duração do plano deve ser maior que zero" }, { status: 400 })
    }

    if (duracao_dias > 365) {
      return NextResponse.json({ error: "Duração do plano não pode ser maior que 365 dias" }, { status: 400 })
    }

    // Verificar se já existe um plano com este nome
    const existente = (await executeQuery("SELECT id FROM planos WHERE nome = ?", [nome])) as RowDataPacket[]

    if (existente.length > 0) {
      return NextResponse.json({ error: "Já existe um plano com este nome" }, { status: 400 })
    }

    const result = (await executeQuery("INSERT INTO planos (nome, valor, duracao_dias) VALUES (?, ?, ?)", [nome, valor, duracao_dias])) as OkPacket

    return NextResponse.json(
      {
        id: result.insertId,
        nome,
        valor,
        duracao_dias,
        message: "Plano criado com sucesso",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erro ao criar plano:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? `Erro interno ao criar plano: ${error.message}` : "Erro interno ao criar plano",
      },
      { status: 500 },
    )
  }
}
