import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testando conectividade com banco de dados...')
    console.log('Variáveis de ambiente:')
    console.log('- SKIP_DB:', process.env.SKIP_DB)
    console.log('- DB_HOST:', process.env.DB_HOST)
    console.log('- DB_USER:', process.env.DB_USER)
    console.log('- DB_NAME:', process.env.DB_NAME)
    console.log('- NODE_ENV:', process.env.NODE_ENV)
    
    // Verificar se SKIP_DB está ativo
    if (process.env.SKIP_DB === 'true') {
      return NextResponse.json({
        status: 'skipped',
        message: 'Conexão com banco de dados pulada (SKIP_DB=true)',
        timestamp: new Date().toISOString(),
        environment: {
          SKIP_DB: process.env.SKIP_DB,
          DB_HOST: process.env.DB_HOST,
          NODE_ENV: process.env.NODE_ENV
        }
      })
    }

    // Tentar executar uma query simples
    const startTime = Date.now()
    const result = await executeQuery('SELECT 1 as test')
    const endTime = Date.now()
    const responseTime = endTime - startTime

    console.log('✅ Conexão com banco de dados bem-sucedida!')
    
    return NextResponse.json({
      status: 'connected',
      message: 'Conexão com banco de dados bem-sucedida',
      responseTime: `${responseTime}ms`,
      result,
      timestamp: new Date().toISOString(),
      environment: {
        SKIP_DB: process.env.SKIP_DB,
        DB_HOST: process.env.DB_HOST,
        NODE_ENV: process.env.NODE_ENV
      }
    })
  } catch (error: any) {
    console.error('❌ Erro na conectividade com banco de dados:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Falha na conexão com banco de dados',
      error: {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname
      },
      timestamp: new Date().toISOString(),
      environment: {
        SKIP_DB: process.env.SKIP_DB,
        DB_HOST: process.env.DB_HOST,
        NODE_ENV: process.env.NODE_ENV
      }
    }, { status: 500 })
  }
}