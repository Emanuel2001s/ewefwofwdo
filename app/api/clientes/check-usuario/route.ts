import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { RowDataPacket } from "mysql2"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { usuario, clienteId } = await request.json()

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuário é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se o usuário já existe (excluindo o cliente atual se for edição)
    let query = "SELECT id FROM clientes WHERE usuario = ?"
    let params = [usuario]

    if (clienteId) {
      query += " AND id != ?"
      params.push(clienteId)
    }

    const usuarioExistente = await executeQuery(query, params) as RowDataPacket[]

    const disponivel = usuarioExistente.length === 0

    return NextResponse.json({
      disponivel,
      message: disponivel 
        ? "Usuário disponível" 
        : "Este usuário já está sendo usado por outro cliente"
    })

  } catch (error) {
    console.error("Erro ao verificar usuário:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 