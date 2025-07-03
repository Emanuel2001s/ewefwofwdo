import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Verificar se a requisição tem o header de segurança do cron
    const authHeader = request.headers.get('x-cron-secret')
    const cronSecret = process.env.CRON_SECRET

    if (!authHeader || authHeader !== cronSecret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Fazer uma requisição POST para o endpoint de processamento
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/envio-massa/processar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`
      }
    })

    const result = await response.json()

    return NextResponse.json(result)

  } catch (error) {
    console.error("Erro ao processar envios:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 