import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import evolutionApiService from '@/lib/evolution-api'

/**
 * POST - Verificar se um número específico existe no WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    await verifyEvolutionPermissions()
    
    const { instanceName, number } = await request.json()
    
    if (!instanceName || !number) {
      return NextResponse.json({
        error: "Nome da instância e número são obrigatórios"
      }, { status: 400 })
    }
    
    console.log(`🔍 Verificando número ${number} na instância ${instanceName}`)
    
    // Verificar status da instância primeiro
    const instanceStatus = await evolutionApiService.getInstanceStatus(instanceName)
    console.log(`📊 Status da instância ${instanceName}: ${instanceStatus}`)
    
    if (instanceStatus !== 'open') {
      return NextResponse.json({
        success: false,
        error: "Instância não está conectada",
        instanceStatus,
        suggestions: [
          "Verifique se a instância está conectada",
          "Escaneie o QR Code se necessário",
          "Reinicie a instância se estiver com problemas"
        ]
      })
    }
    
    // Tentar envio de teste para detectar se o número existe
    try {
      console.log(`🧪 Tentativa de envio de teste para ${number}`)
      
      const testResult = await evolutionApiService.sendTextMessage(
        instanceName,
        number,
        "✅ Teste de conectividade - número válido!"
      )
      
      return NextResponse.json({
        success: true,
        number,
        exists: true,
        instanceStatus,
        testResult,
        suggestions: [
          "Número válido e registrado no WhatsApp",
          "Mensagem de teste enviada com sucesso",
          "Pode enviar mensagens normalmente para este número"
        ]
      })
      
    } catch (testError: any) {
      const errorData = testError.response?.data
      const isNumberNotFound = errorData?.response?.message?.some((msg: any) => msg.exists === false)
      
      console.error(`❌ Erro ao enviar para ${number}:`, errorData)
      
      return NextResponse.json({
        success: false,
        number,
        exists: false,
        error: errorData || testError.message,
        numberNotFound: isNumberNotFound,
        instanceStatus,
        suggestions: isNumberNotFound ? [
          "❌ Número não existe no WhatsApp",
          "Verifique se o número está digitado corretamente",
          "Confirme se a pessoa tem conta ativa no WhatsApp",
          "Formato brasileiro: 55 + DDD + 9 + 8 dígitos (ex: 5511987654321)"
        ] : [
          "Erro de conectividade ou configuração da instância",
          "Verifique se a instância está funcionando corretamente",
          "Tente reiniciar a instância se necessário"
        ]
      })
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao verificar número:', error)
    return NextResponse.json({
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 })
  }
} 