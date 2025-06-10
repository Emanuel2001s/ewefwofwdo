import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { nome, whatsapp, data_vencimento, plano_id, servidor_id, observacoes, dispositivos, status } =
      await request.json()

    // Validações básicas
    if (!nome || nome.trim() === "") {
      return NextResponse.json({ error: "Nome do cliente é obrigatório" }, { status: 400 })
    }

    if (!whatsapp || whatsapp.trim() === "") {
      return NextResponse.json({ error: "WhatsApp do cliente é obrigatório" }, { status: 400 })
    }

    if (!plano_id) {
      return NextResponse.json({ error: "Plano é obrigatório" }, { status: 400 })
    }

    if (!servidor_id) {
      return NextResponse.json({ error: "Servidor é obrigatório" }, { status: 400 })
    }

    // Verificar se o plano existe
    const plano = await executeQuery("SELECT id FROM planos WHERE id = ?", [plano_id])

    if (plano.length === 0) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 400 })
    }

    // Verificar se o servidor existe
    const servidor = await executeQuery("SELECT id FROM servidores WHERE id = ?", [servidor_id])

    if (servidor.length === 0) {
      return NextResponse.json({ error: "Servidor não encontrado" }, { status: 400 })
    }

    // Formatar a data de vencimento
    const dataFormatada = new Date(data_vencimento).toISOString().split("T")[0]

    // Inserir o cliente
    const result = await executeQuery(
      `INSERT INTO clientes 
       (nome, whatsapp, data_vencimento, plano_id, servidor_id, observacoes, dispositivos, status, usuario_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, whatsapp, dataFormatada, plano_id, servidor_id, observacoes, dispositivos, status, null],
    )

    return NextResponse.json(
      {
        id: result.insertId,
        nome,
        message: "Cliente criado com sucesso",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 })
  }
}
