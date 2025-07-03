import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function GET() {
  try {
    console.log('🧪 [TEST] Teste direto da busca de instâncias...')
    
    const instances = await executeQuery(`
      SELECT 
        id,
        nome,
        instance_name,
        status,
        created_at,
        updated_at
      FROM evolution_instancias 
      ORDER BY created_at DESC
    `) as RowDataPacket[]
    
    console.log('🧪 [TEST] Instâncias encontradas:', instances)
    
    return NextResponse.json({
      success: true,
      message: 'Teste realizado com sucesso',
      count: instances.length,
      instances: instances
    })
    
  } catch (error: any) {
    console.error('🧪 [TEST] Erro no teste:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 