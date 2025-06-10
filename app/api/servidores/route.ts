import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const servidores = await executeQuery("SELECT id, nome FROM servidores ORDER BY nome ASC")
    return NextResponse.json(servidores)
  } catch (error) {
    console.error("Erro ao buscar servidores:", error)
    return NextResponse.json({ error: "Erro ao buscar servidores" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { nome } = await request.json()

    if (!nome || nome.trim() === "") {
      return NextResponse.json({ error: "Nome do servidor é obrigatório" }, { status: 400 })
    }

    // Verificar se já existe um servidor com este nome
    const existente = await executeQuery("SELECT id FROM servidores WHERE nome = ?", [nome])

    if (existente.length > 0) {
      return NextResponse.json({ error: "Já existe um servidor com este nome" }, { status: 400 })
    }

    const result = await executeQuery("INSERT INTO servidores (nome) VALUES (?)", [nome])

    return NextResponse.json(
      {
        id: result.insertId,
        nome,
        message: "Servidor criado com sucesso",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erro ao criar servidor:", error)
    return NextResponse.json({ error: "Erro ao criar servidor" }, { status: 500 })
  }
}
