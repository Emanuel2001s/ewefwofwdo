import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const planos = await executeQuery("SELECT id, nome, valor FROM planos ORDER BY nome ASC")
    return NextResponse.json(planos)
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

    const { nome, valor } = await request.json()

    if (!nome || nome.trim() === "") {
      return NextResponse.json({ error: "Nome do plano é obrigatório" }, { status: 400 })
    }

    if (!valor || isNaN(valor) || valor <= 0) {
      return NextResponse.json({ error: "Valor do plano deve ser maior que zero" }, { status: 400 })
    }

    // Verificar se já existe um plano com este nome
    const existente = await executeQuery("SELECT id FROM planos WHERE nome = ?", [nome])

    if (existente.length > 0) {
      return NextResponse.json({ error: "Já existe um plano com este nome" }, { status: 400 })
    }

    const result = await executeQuery("INSERT INTO planos (nome, valor) VALUES (?, ?)", [nome, valor])

    return NextResponse.json(
      {
        id: result.insertId,
        nome,
        valor,
        message: "Plano criado com sucesso",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erro ao criar plano:", error)
    return NextResponse.json({ error: "Erro ao criar plano" }, { status: 500 })
  }
}
