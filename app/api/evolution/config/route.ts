import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { getConfiguracao, updateConfiguracao } from '@/lib/configuracoes'
import evolutionApiService from '@/lib/evolution-api'

/**
 * GET - Buscar configurações da Evolution API
 */
export async function GET() {
  try {
    await verifyEvolutionPermissions()
    
    const evolutionApiUrl = await getConfiguracao('evolution_api_url') || ''
    const evolutionApiKey = await getConfiguracao('evolution_api_key') || ''
    
    // Não retornar a API Key completa por segurança, apenas indicar se existe
    const hasApiKey = evolutionApiKey.length > 0
    
    return NextResponse.json({
      evolution_api_url: evolutionApiUrl,
      has_api_key: hasApiKey,
      api_key_preview: hasApiKey ? evolutionApiKey.substring(0, 8) + '...' : '',
      configured: evolutionApiUrl.length > 0 && hasApiKey
    })
  } catch (error: any) {
    console.error('Erro ao buscar configurações Evolution:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
}

/**
 * PUT - Atualizar configurações da Evolution API
 */
export async function PUT(request: NextRequest) {
  try {
    await verifyEvolutionPermissions()
    
    const body = await request.json()
    const { evolution_api_url, evolution_api_key } = body
    
    // Validar dados
    if (!evolution_api_url || !evolution_api_key) {
      return NextResponse.json(
        { error: 'URL da Evolution API e API Key são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Validar formato da URL
    try {
      new URL(evolution_api_url)
    } catch {
      return NextResponse.json(
        { error: 'URL da Evolution API inválida' },
        { status: 400 }
      )
    }
    
    // Atualizar configurações
    const urlUpdated = await updateConfiguracao('evolution_api_url', evolution_api_url)
    const keyUpdated = await updateConfiguracao('evolution_api_key', evolution_api_key)
    
    if (!urlUpdated || !keyUpdated) {
      return NextResponse.json(
        { error: 'Falha ao atualizar configurações' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Configurações atualizadas com sucesso',
      evolution_api_url,
      configured: true
    })
  } catch (error: any) {
    console.error('Erro ao atualizar configurações Evolution:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
}

/**
 * POST - Testar conexão com Evolution API
 */
export async function POST() {
  try {
    await verifyEvolutionPermissions()
    
    // Verificar se as configurações estão definidas
    const evolutionApiUrl = await getConfiguracao('evolution_api_url') || ''
    const evolutionApiKey = await getConfiguracao('evolution_api_key') || ''
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json({
        success: false,
        message: 'Configure primeiro a URL e API Key da Evolution API',
        connected: false,
        details: {
          hasUrl: !!evolutionApiUrl,
          hasApiKey: !!evolutionApiKey
        }
      }, { status: 400 })
    }
    
    const connectionTest = await evolutionApiService.testConnection()
    
    if (connectionTest) {
      return NextResponse.json({
        success: true,
        message: 'Conexão com Evolution API estabelecida com sucesso',
        connected: true,
        details: {
          url: evolutionApiUrl,
          endpoint: '/instance/fetchInstances'
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Falha ao conectar com Evolution API. Verifique a URL e API Key.',
        connected: false,
        details: {
          url: evolutionApiUrl,
          endpoint: '/instance/fetchInstances',
          suggestion: 'Verifique se a URL está correta e se a API Key tem permissões adequadas'
        }
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Erro ao testar conexão Evolution:', error)
    
    let errorMessage = 'Erro ao testar conexão'
    let statusCode = 500
    
    if (error.message?.includes('Acesso negado')) {
      errorMessage = 'Acesso negado - apenas Admin Supremo pode configurar Evolution API'
      statusCode = 403
    } else if (error.message?.includes('não configurada')) {
      errorMessage = error.message
      statusCode = 400
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Não foi possível conectar com a Evolution API. Verifique se o servidor está online.'
      statusCode = 503
    } else if (error.response?.status === 401) {
      errorMessage = 'API Key inválida ou sem permissões'
      statusCode = 401
    } else if (error.response?.status === 404) {
      errorMessage = 'Endpoint não encontrado. Verifique se a URL da Evolution API está correta.'
      statusCode = 404
    }
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      connected: false,
      error: {
        type: error.name || 'UnknownError',
        message: error.message,
        status: error.response?.status,
        code: error.code
      }
    }, { status: statusCode })
  }
} 