import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import evolutionApiService from '@/lib/evolution-api'

/**
 * POST - Testar formatação de número de telefone
 */
export async function POST(request: NextRequest) {
  try {
    await verifyEvolutionPermissions()
    
    const { number } = await request.json()
    
    if (!number) {
      return NextResponse.json({
        error: "Número é obrigatório"
      }, { status: 400 })
    }
    
    console.log(`🧪 Testando formatação do número: ${number}`)
    
    // Simular formatação do auto-envio-massa.ts
    let numeroAutoEnvio = number.replace(/\D/g, '')
    
    if (numeroAutoEnvio.startsWith('0')) {
      numeroAutoEnvio = numeroAutoEnvio.substring(1)
    }
    
    if (numeroAutoEnvio.length === 11 && !numeroAutoEnvio.startsWith('55')) {
      numeroAutoEnvio = '55' + numeroAutoEnvio
    } else if (numeroAutoEnvio.length === 13 && numeroAutoEnvio.startsWith('55')) {
      // Já está formatado
    } else if (numeroAutoEnvio.length === 12 && !numeroAutoEnvio.startsWith('55')) {
      numeroAutoEnvio = '55' + numeroAutoEnvio
    }
    
    // Testar formatação da Evolution API (método privado simulado)
    let numeroEvolution = numeroAutoEnvio.replace(/\D/g, '')
    
    if (numeroEvolution.startsWith('0')) {
      numeroEvolution = numeroEvolution.substring(1)
    }
    
    if (numeroEvolution.length === 11 && !numeroEvolution.startsWith('55')) {
      numeroEvolution = '55' + numeroEvolution
    } else if (numeroEvolution.length === 13 && numeroEvolution.startsWith('55')) {
      // Já está formatado
    } else if (numeroEvolution.length === 12 && !numeroEvolution.startsWith('55')) {
      numeroEvolution = '55' + numeroEvolution
    }
    
    const numeroFinal = numeroEvolution + '@s.whatsapp.net'
    
    // Verificar status da instância
    const instanceStatus = await evolutionApiService.getInstanceStatus('teste')
    
    return NextResponse.json({
      numero_original: number,
      formatacao_auto_envio: numeroAutoEnvio,
      formatacao_evolution: numeroEvolution,
      numero_final_whatsapp: numeroFinal,
      tamanho_final: numeroEvolution.length,
      valido: numeroEvolution.length >= 12 && numeroEvolution.length <= 13,
      instance_status: instanceStatus,
      observacoes: {
        tamanho_original: number.replace(/\D/g, '').length,
        tem_codigo_pais: numeroEvolution.startsWith('55'),
        formatacao_ok: numeroEvolution.length >= 12 && numeroEvolution.length <= 13
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Erro ao testar formatação:', error)
    return NextResponse.json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 