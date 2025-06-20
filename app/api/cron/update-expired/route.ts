import { NextResponse } from "next/server"
import { updateExpiredClients } from "@/lib/auto-update-clients"

export async function GET(request: Request) {
  try {
    // Verificar se a requisição vem de um cron job autorizado
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Executar atualização de clientes vencidos
    const result = await updateExpiredClients()
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    })

  } catch (error) {
    console.error("Erro no cron job de atualização de clientes:", error)
    return NextResponse.json({ 
      error: "Erro interno no cron job",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Também permitir POST para flexibilidade
export async function POST(request: Request) {
  return GET(request)
} 