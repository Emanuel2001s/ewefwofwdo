import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { RowDataPacket, OkPacket } from "mysql2"

export async function GET(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const totalServidoresResult = (await executeQuery("SELECT COUNT(*) as total FROM servidores")) as RowDataPacket[]
    const totalServidores = totalServidoresResult[0].total
    const totalPages = Math.ceil(totalServidores / limit)

    const servidores = await executeQuery(
      "SELECT id, nome FROM servidores ORDER BY nome ASC LIMIT ? OFFSET ?",
      [limit, offset],
    )

    return NextResponse.json({
      data: servidores,
      pagination: {
        totalItems: totalServidores,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    })
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
    const existente = (await executeQuery("SELECT id FROM servidores WHERE nome = ?", [nome])) as RowDataPacket[]

    if (existente.length > 0) {
      return NextResponse.json({ error: "Já existe um servidor com este nome" }, { status: 400 })
    }

    const result = (await executeQuery("INSERT INTO servidores (nome) VALUES (?)", [nome])) as OkPacket

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
    return NextResponse.json(
      {
        error: error instanceof Error ? `Erro interno ao criar servidor: ${error.message}` : "Erro interno ao criar servidor",
      },
      { status: 500 },
    )
  }
}
