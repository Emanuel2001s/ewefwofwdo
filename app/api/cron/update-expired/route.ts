import { NextRequest, NextResponse } from 'next/server'
import { updateExpiredClients } from '@/lib/auto-update-clients'
import { getConfiguracao } from '@/lib/configuracoes'

export async function GET(request: NextRequest) {
  try {
    // Verificar se a requisição tem o header de segurança do cron
    const authHeader = request.headers.get('x-cron-secret')
    const cronSecret = process.env.CRON_SECRET

    if (!authHeader || authHeader !== cronSecret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar o horário configurado
    const horarioConfig = await getConfiguracao('notificacao_horario')
    const [horaConfig, minutoConfig] = (horarioConfig || '08:00').split(':').map(Number)
    
    // Obter hora atual
    const agora = new Date()
    const horaAtual = agora.getHours()
    const minutoAtual = agora.getMinutes()
    
    // Só executar se for o horário configurado
    if (horaAtual === horaConfig && minutoAtual === 0) {
      await updateExpiredClients()
      return NextResponse.json(
        { 
          success: true,
          message: 'Clientes atualizados com sucesso',
          details: {
            horario_configurado: `${horaConfig}:${minutoConfig}`,
            horario_atual: `${horaAtual}:${minutoAtual}`
          }
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Fora do horário configurado para atualização',
          details: {
            horario_configurado: `${horaConfig}:${minutoConfig}`,
            horario_atual: `${horaAtual}:${minutoAtual}`
          }
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Erro ao atualizar clientes:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao atualizar clientes',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Também permitir POST para flexibilidade
export async function POST() {
  return GET()
} 