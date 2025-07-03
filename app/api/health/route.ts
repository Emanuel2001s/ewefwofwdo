import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import evolutionApiService from '@/lib/evolution-api'

export async function GET() {
  try {
    // Verificar conexão com banco de dados
    const dbCheck = await executeQuery('SELECT 1 as health_check')
    const dbConnected = Array.isArray(dbCheck) && dbCheck.length > 0

    // Verificar conexão com Evolution API
    let evolutionConnected = false
    try {
      evolutionConnected = await evolutionApiService.testConnection()
    } catch (error) {
      console.error('Erro ao verificar Evolution API:', error)
    }

    // Verificar status das instâncias
    const instances = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('conectada', 'open') THEN 1 ELSE 0 END) as connected
      FROM evolution_instancias
    `) as any[]

    const instanceStats = instances[0] || { total: 0, connected: 0 }

    // Verificar campanhas ativas
    const campaigns = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'enviando' THEN 1 ELSE 0 END) as sending,
        SUM(CASE WHEN status = 'agendada' THEN 1 ELSE 0 END) as scheduled
      FROM campanhas_envio_massa
      WHERE status IN ('enviando', 'agendada')
    `) as any[]

    const campaignStats = campaigns[0] || { total: 0, sending: 0, scheduled: 0 }

    // Preparar resposta
    const status = dbConnected && evolutionConnected ? 'healthy' : 'degraded'
    const statusCode = status === 'healthy' ? 200 : 503

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: dbConnected ? 'connected' : 'error',
          latency: dbConnected ? 'ok' : 'n/a'
        },
        evolution_api: {
          status: evolutionConnected ? 'connected' : 'error'
        },
        whatsapp_instances: {
          total: Number(instanceStats.total),
          connected: Number(instanceStats.connected),
          status: instanceStats.connected > 0 ? 'operational' : 'warning'
        },
        campaigns: {
          active: Number(campaignStats.sending),
          scheduled: Number(campaignStats.scheduled),
          status: 'operational'
        }
      },
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
    }, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Erro no health check:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
} 