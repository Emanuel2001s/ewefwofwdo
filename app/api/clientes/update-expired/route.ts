import { NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { RowDataPacket, OkPacket } from "mysql2"

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar clientes vencidos que ainda estão ativos
    const expiredClients = await executeQuery(`
      SELECT id, nome, data_vencimento 
      FROM clientes 
      WHERE DATE(data_vencimento) < CURDATE() 
      AND status = 'ativo'
    `) as RowDataPacket[]

    if (expiredClients.length === 0) {
      return NextResponse.json({ 
        message: "Nenhum cliente vencido encontrado",
        updated: 0,
        clients: []
      })
    }

    // Atualizar status para inativo
    const result = await executeQuery(`
      UPDATE clientes 
      SET status = 'inativo' 
      WHERE DATE(data_vencimento) < CURDATE() 
      AND status = 'ativo'
    `) as OkPacket

    return NextResponse.json({
      message: `${result.affectedRows} cliente(s) atualizado(s) para status 'inativo'`,
      updated: result.affectedRows,
      clients: expiredClients.map(client => ({
        id: client.id,
        nome: client.nome,
        data_vencimento: client.data_vencimento
      }))
    })

  } catch (error) {
    console.error("Erro ao atualizar clientes vencidos:", error)
    return NextResponse.json({ error: "Erro ao atualizar clientes vencidos" }, { status: 500 })
  }
} 