import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { RowDataPacket, OkPacket } from "mysql2"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id = params.id
    const plano = (await executeQuery("SELECT id, nome, valor, duracao_dias FROM planos WHERE id = ?", [id])) as RowDataPacket[]

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

    // Verificar se o plano existe
    const plano = (await executeQuery("SELECT id FROM planos WHERE id = ?", [id])) as RowDataPacket[]

    if (plano.length === 0) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    // Verificar se já existe outro plano com este nome
    const existente = (await executeQuery("SELECT id FROM planos WHERE nome = ? AND id != ?", [nome, id])) as RowDataPacket[]

    if (existente.length > 0) {
      return NextResponse.json({ error: "Já existe outro plano com este nome" }, { status: 400 })
    }

    await executeQuery("UPDATE planos SET nome = ?, valor = ?, duracao_dias = ? WHERE id = ?", [nome, valor, duracao_dias, id])

    return NextResponse.json({
      id: Number(id),
      nome,
      valor,
      duracao_dias,
      message: "Plano atualizado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao atualizar plano:", error)
    return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log(`🗑️ [API] Iniciando DELETE do plano ID: ${params.id}`)
    
    const user = await getAuthUser()
    console.log(`👤 [API] Usuário autenticado:`, user ? { id: user.id, tipo: user.tipo } : 'null')

    if (!user || user.tipo !== "admin") {
      console.log(`❌ [API] Usuário não autorizado`)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id = params.id
    console.log(`🔍 [API] Verificando se plano ${id} existe...`)

    // Verificar se o plano existe
    const plano = (await executeQuery("SELECT id FROM planos WHERE id = ?", [id])) as RowDataPacket[]
    console.log(`📋 [API] Plano encontrado:`, plano.length > 0 ? 'SIM' : 'NÃO')

    if (plano.length === 0) {
      console.log(`❌ [API] Plano ${id} não encontrado`)
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    // Verificar se há clientes usando este plano
    console.log(`🔍 [API] Verificando clientes vinculados ao plano ${id}...`)
    const clientesUsando = (await executeQuery("SELECT COUNT(*) as total FROM clientes WHERE plano_id = ?", [id])) as RowDataPacket[]
    console.log(`👥 [API] Clientes usando este plano:`, clientesUsando[0].total)

    if (clientesUsando[0].total > 0) {
      console.log(`❌ [API] Não é possível excluir: ${clientesUsando[0].total} clientes vinculados`)
      return NextResponse.json(
        {
          error: "Não é possível excluir este plano pois existem clientes vinculados a ele",
        },
        { status: 400 },
      )
    }

    console.log(`🗑️ [API] Executando DELETE do plano ${id}...`)
    await executeQuery("DELETE FROM planos WHERE id = ?", [id])
    console.log(`✅ [API] Plano ${id} excluído com sucesso`)

    return NextResponse.json({
      message: "Plano excluído com sucesso",
    })
  } catch (error) {
    console.error("❌ [API] Erro ao excluir plano:", error)
    return NextResponse.json({ error: "Erro ao excluir plano" }, { status: 500 })
  }
}
