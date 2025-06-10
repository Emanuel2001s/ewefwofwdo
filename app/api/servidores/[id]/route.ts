import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id = params.id
    const servidor = await executeQuery("SELECT id, nome FROM servidores WHERE id = ?", [id])

    if (servidor.length === 0) {
      return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 })
    }

    return NextResponse.json(servidor[0])
  } catch (error) {
    console.error("Erro ao buscar servidor:", error)
    return NextResponse.json({ error: "Erro ao buscar servidor" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id = params.id
    const { nome } = await request.json()

    if (!nome || nome.trim() === "") {
      return NextResponse.json({ error: "Nome do servidor é obrigatório" }, { status: 400 })
    }

    // Verificar se o servidor existe
    const servidor = await executeQuery("SELECT id FROM servidores WHERE id = ?", [id])

    if (servidor.length === 0) {
      return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 })
    }

    // Verificar se já existe outro servidor com este nome
    const existente = await executeQuery("SELECT id FROM servidores WHERE nome = ? AND id != ?", [nome, id])

    if (existente.length > 0) {
      return NextResponse.json({ error: "Já existe outro servidor com este nome" }, { status: 400 })
    }

    await executeQuery("UPDATE servidores SET nome = ? WHERE id = ?", [nome, id])

    return NextResponse.json({
      id: Number(id),
      nome,
      message: "Servidor atualizado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao atualizar servidor:", error)
    return NextResponse.json({ error: "Erro ao atualizar servidor" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id = params.id

    // Verificar se o servidor existe
    const servidor = await executeQuery("SELECT id FROM servidores WHERE id = ?", [id])

    if (servidor.length === 0) {
      return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 })
    }

    // Verificar se há clientes usando este servidor
    const clientesUsando = await executeQuery("SELECT COUNT(*) as total FROM clientes WHERE servidor_id = ?", [id])

    if (clientesUsando[0].total > 0) {
      return NextResponse.json(
        {
          error: "Não é possível excluir este servidor pois existem clientes vinculados a ele",
        },
        { status: 400 },
      )
    }

    await executeQuery("DELETE FROM servidores WHERE id = ?", [id])

    return NextResponse.json({
      message: "Servidor excluído com sucesso",
    })
  } catch (error) {
    console.error("Erro ao excluir servidor:", error)
    return NextResponse.json({ error: "Erro ao excluir servidor" }, { status: 500 })
  }
}
