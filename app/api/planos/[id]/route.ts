import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id = params.id
    const plano = await executeQuery("SELECT id, nome, valor FROM planos WHERE id = ?", [id])

    if (plano.length === 0) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    return NextResponse.json(plano[0])
  } catch (error) {
    console.error("Erro ao buscar plano:", error)
    return NextResponse.json({ error: "Erro ao buscar plano" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id = params.id
    const { nome, valor } = await request.json()

    if (!nome || nome.trim() === "") {
      return NextResponse.json({ error: "Nome do plano é obrigatório" }, { status: 400 })
    }

    if (!valor || isNaN(valor) || valor <= 0) {
      return NextResponse.json({ error: "Valor do plano deve ser maior que zero" }, { status: 400 })
    }

    // Verificar se o plano existe
    const plano = await executeQuery("SELECT id FROM planos WHERE id = ?", [id])

    if (plano.length === 0) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    // Verificar se já existe outro plano com este nome
    const existente = await executeQuery("SELECT id FROM planos WHERE nome = ? AND id != ?", [nome, id])

    if (existente.length > 0) {
      return NextResponse.json({ error: "Já existe outro plano com este nome" }, { status: 400 })
    }

    await executeQuery("UPDATE planos SET nome = ?, valor = ? WHERE id = ?", [nome, valor, id])

    return NextResponse.json({
      id: Number(id),
      nome,
      valor,
      message: "Plano atualizado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao atualizar plano:", error)
    return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id = params.id

    // Verificar se o plano existe
    const plano = await executeQuery("SELECT id FROM planos WHERE id = ?", [id])

    if (plano.length === 0) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    // Verificar se há clientes usando este plano
    const clientesUsando = await executeQuery("SELECT COUNT(*) as total FROM clientes WHERE plano_id = ?", [id])

    if (clientesUsando[0].total > 0) {
      return NextResponse.json(
        {
          error: "Não é possível excluir este plano pois existem clientes vinculados a ele",
        },
        { status: 400 },
      )
    }

    await executeQuery("DELETE FROM planos WHERE id = ?", [id])

    return NextResponse.json({
      message: "Plano excluído com sucesso",
    })
  } catch (error) {
    console.error("Erro ao excluir plano:", error)
    return NextResponse.json({ error: "Erro ao excluir plano" }, { status: 500 })
  }
}
