import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser, hashPassword } from "@/lib/auth"
import { RowDataPacket } from "mysql2"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "cliente") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { senhaAtual, novaSenha } = await request.json()

    if (!senhaAtual || !novaSenha) {
      return NextResponse.json(
        { error: "Senha atual e nova senha são obrigatórias" },
        { status: 400 }
      )
    }

    if (novaSenha.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Buscar o cliente atual
    const clienteResult = await executeQuery(
      "SELECT * FROM clientes WHERE id = ?",
      [user.id]
    ) as RowDataPacket[]

    if (clienteResult.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    const cliente = clienteResult[0]

    // Verificar se a senha atual está correta usando bcrypt.compare
    const isValidPassword = await bcrypt.compare(senhaAtual, cliente.senha)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 }
      )
    }

    // Criptografar a nova senha
    const novaSenhaHash = await hashPassword(novaSenha)

    // Atualizar a senha no banco de dados
    await executeQuery(
      "UPDATE clientes SET senha = ? WHERE id = ?",
      [novaSenhaHash, user.id]
    )

    return NextResponse.json({ 
      message: "Senha alterada com sucesso" 
    })

  } catch (error) {
    console.error("Erro ao alterar senha:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 