import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar instâncias disponíveis
    const instancias = await executeQuery(`
      SELECT 
        id,
        nome,
        instance_name,
        status,
        qr_code,
        created_at,
        updated_at
      FROM evolution_instancias
      ORDER BY nome ASC
    `) as any[]

    // Formatar dados das instâncias
    const instanciasFormatadas = (instancias || []).map((instancia: any) => ({
      id: instancia.id,
      nome: instancia.nome,
      instance_name: instancia.instance_name,
      status: instancia.status,
      disponivel: instancia.status === 'conectada' || instancia.status === 'connected',
      statusTexto: getStatusTexto(instancia.status),
      statusCor: getStatusCor(instancia.status),
      created_at: instancia.created_at,
      updated_at: instancia.updated_at
    }))

    return NextResponse.json({
      instancias: instanciasFormatadas,
      success: true
    })

  } catch (error) {
    console.error("Erro ao buscar instâncias:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

function getStatusTexto(status: string): string {
  const statusMap: { [key: string]: string } = {
    'conectada': 'Conectada',
    'connected': 'Conectada',
    'disconnected': 'Desconectada',
    'desconectada': 'Desconectada',
    'connecting': 'Conectando',
    'conectando': 'Conectando',
    'qrcode': 'Aguardando QR Code',
    'error': 'Erro',
    'erro': 'Erro',
    'paused': 'Pausada',
    'pausada': 'Pausada'
  }
  
  return statusMap[status] || 'Desconhecido'
}

function getStatusCor(status: string): string {
  const corMap: { [key: string]: string } = {
    'conectada': 'green',
    'connected': 'green',
    'disconnected': 'red',
    'desconectada': 'red',
    'connecting': 'yellow',
    'conectando': 'yellow',
    'qrcode': 'blue',
    'error': 'red',
    'erro': 'red',
    'paused': 'gray',
    'pausada': 'gray'
  }
  
  return corMap[status] || 'gray'
} 