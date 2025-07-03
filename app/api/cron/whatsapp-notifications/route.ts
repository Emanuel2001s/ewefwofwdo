import { NextRequest, NextResponse } from 'next/server'
import { executeAutoNotifications } from '@/lib/auto-whatsapp-notifications'

/**
 * POST - Executar sistema automático de notificações (Cron Job)
 * Este endpoint pode ser chamado manualmente ou por sistemas de cron externos
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando execução automática de notificações WhatsApp')
    
    // Verificar se há parâmetros específicos na request
    const body = await request.json().catch(() => ({}))
    const { force = false, dias_antecedencia } = body
    
    // Executar sistema automático
    const result = await executeAutoNotifications()
    
    // Log do resultado
    console.log('📊 Resultado da execução automática:', {
      success: result.success,
      processed: result.processed,
      sent: result.sent,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })
    
    // Log detalhado para debug
    result.details.forEach(detail => {
      console.log(detail)
    })
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Notificações processadas com sucesso: ${result.sent}/${result.processed} enviadas`
        : `Erro ao processar notificações: ${result.errors} erro(s)`,
      statistics: {
        processed: result.processed,
        sent: result.sent,
        errors: result.errors,
        success_rate: result.processed > 0 ? ((result.sent / result.processed) * 100).toFixed(1) + '%' : '0%'
      },
      details: result.details,
      timestamp: new Date().toISOString()
    }, { 
      status: result.success ? 200 : 500 
    })
    
  } catch (error: any) {
    console.error('💥 Erro fatal no sistema automático de notificações:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Erro fatal no sistema automático',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * GET - Verificar status do cron job e últimas execuções
 */
export async function GET() {
  try {
    // Buscar últimas execuções do histórico
    const recentHistory = await getRecentExecutionHistory()
    
    // Buscar estatísticas gerais
    const stats = await getGeneralStats()
    
    return NextResponse.json({
      status: 'Cron job WhatsApp ativo',
      recent_executions: recentHistory,
      general_stats: stats,
      next_execution_info: {
        recommended_frequency: 'A cada 6 horas (4x por dia)',
        best_times: ['08:00', '14:00', '20:00'],
        timezone: 'America/Sao_Paulo'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Erro ao buscar status do cron job:', error)
    
    return NextResponse.json({
      status: 'Erro ao verificar status',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Busca histórico recente de execuções
 */
async function getRecentExecutionHistory() {
  try {
    const { executeQuery } = await import('@/lib/db')
    const { RowDataPacket } = await import('mysql2')
    
    const history = await executeQuery(`
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total_mensagens,
        SUM(CASE WHEN status IN ('enviada', 'lida') THEN 1 ELSE 0 END) as sucessos,
        SUM(CASE WHEN status = 'erro' THEN 1 ELSE 0 END) as erros,
        COUNT(DISTINCT cliente_id) as clientes_unicos,
        MIN(created_at) as primeira_execucao,
        MAX(created_at) as ultima_execucao
      FROM message_history
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND template_id IN (SELECT id FROM message_templates WHERE tipo = 'vencimento')
      GROUP BY DATE(created_at)
      ORDER BY data DESC
      LIMIT 10
    `) as RowDataPacket[]
    
    return history.map(item => ({
      data: item.data,
      total_mensagens: Number(item.total_mensagens),
      sucessos: Number(item.sucessos),
      erros: Number(item.erros),
      clientes_unicos: Number(item.clientes_unicos),
      taxa_sucesso: item.total_mensagens > 0 
        ? ((item.sucessos / item.total_mensagens) * 100).toFixed(1) + '%' 
        : '0%',
      primeira_execucao: item.primeira_execucao,
      ultima_execucao: item.ultima_execucao
    }))
    
  } catch (error) {
    console.error('Erro ao buscar histórico de execuções:', error)
    return []
  }
}

/**
 * Busca estatísticas gerais do sistema
 */
async function getGeneralStats() {
  try {
    const { executeQuery } = await import('@/lib/db')
    const { RowDataPacket } = await import('mysql2')
    
    // Estatísticas de instâncias
    const instanceStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_instancias,
        SUM(CASE WHEN status IN ('conectada', 'open') THEN 1 ELSE 0 END) as conectadas,
        SUM(CASE WHEN status IN ('desconectada', 'close') THEN 1 ELSE 0 END) as desconectadas,
        SUM(CASE WHEN status = 'erro' THEN 1 ELSE 0 END) as com_erro
      FROM evolution_instancias
    `) as RowDataPacket[]
    
    // Estatísticas de templates
    const templateStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_templates,
        SUM(CASE WHEN ativo = TRUE THEN 1 ELSE 0 END) as ativos,
        SUM(CASE WHEN tipo = 'vencimento' AND ativo = TRUE THEN 1 ELSE 0 END) as vencimento_ativos
      FROM message_templates
    `) as RowDataPacket[]
    
    // Clientes com WhatsApp
    const clienteStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_clientes,
        SUM(CASE WHEN whatsapp IS NOT NULL AND whatsapp != '' THEN 1 ELSE 0 END) as com_whatsapp,
        SUM(CASE WHEN status = 'ativo' AND whatsapp IS NOT NULL AND whatsapp != '' THEN 1 ELSE 0 END) as ativos_com_whatsapp
      FROM clientes
    `) as RowDataPacket[]
    
    // Próximos vencimentos
    const proximosVencimentos = await executeQuery(`
      SELECT COUNT(*) as proximos_vencimentos
      FROM clientes 
      WHERE status = 'ativo'
        AND whatsapp IS NOT NULL 
        AND whatsapp != ''
        AND DATE(data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    `) as RowDataPacket[]
    
    return {
      instancias: {
        total: Number(instanceStats[0]?.total_instancias || 0),
        conectadas: Number(instanceStats[0]?.conectadas || 0),
        desconectadas: Number(instanceStats[0]?.desconectadas || 0),
        com_erro: Number(instanceStats[0]?.com_erro || 0)
      },
      templates: {
        total: Number(templateStats[0]?.total_templates || 0),
        ativos: Number(templateStats[0]?.ativos || 0),
        vencimento_ativos: Number(templateStats[0]?.vencimento_ativos || 0)
      },
      clientes: {
        total: Number(clienteStats[0]?.total_clientes || 0),
        com_whatsapp: Number(clienteStats[0]?.com_whatsapp || 0),
        ativos_com_whatsapp: Number(clienteStats[0]?.ativos_com_whatsapp || 0)
      },
      proximos_vencimentos: Number(proximosVencimentos[0]?.proximos_vencimentos || 0)
    }
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas gerais:', error)
    return {
      instancias: { total: 0, conectadas: 0, desconectadas: 0, com_erro: 0 },
      templates: { total: 0, ativos: 0, vencimento_ativos: 0 },
      clientes: { total: 0, com_whatsapp: 0, ativos_com_whatsapp: 0 },
      proximos_vencimentos: 0
    }
  }
} 