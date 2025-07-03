import { NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { executeQuery } from '@/lib/db'
import { RowDataPacket } from 'mysql2'
import evolutionApiService from '@/lib/evolution-api'

/**
 * POST - Sincronizar status das instâncias com a Evolution API
 */
export async function POST() {
  try {
    await verifyEvolutionPermissions()
    
    // Buscar instâncias do banco local
    const instances = await executeQuery(`
      SELECT id, instance_name, status
      FROM evolution_instancias 
      ORDER BY created_at DESC
    `) as RowDataPacket[]
    
    let updatedCount = 0
    const results = []
    
    // Verificar status na Evolution API e atualizar se necessário
    for (const instance of instances) {
      try {
        console.log(`🔍 Verificando status da instância: ${instance.instance_name}`)
        const currentStatus = await evolutionApiService.getInstanceStatus(instance.instance_name)
        
        // Mapear status para formato do banco
        let mappedStatus = currentStatus
        if (currentStatus === 'open') {
          mappedStatus = 'conectada'
        } else if (currentStatus === 'close') {
          mappedStatus = 'desconectada'
        } else if (currentStatus === 'connecting') {
          mappedStatus = 'conectando'
        } else if (currentStatus === 'creating') {
          mappedStatus = 'criando'
        }
        
        // Atualizar status no banco se mudou
        if (mappedStatus !== instance.status) {
          console.log(`🔄 Atualizando status no banco: ${instance.status} -> ${mappedStatus}`)
          await executeQuery(
            'UPDATE evolution_instancias SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [mappedStatus, instance.id]
          )
          updatedCount++
        }
        
        results.push({
          instance_name: instance.instance_name,
          old_status: instance.status,
          new_status: mappedStatus,
          updated: mappedStatus !== instance.status
        })
        
      } catch (error) {
        console.error(`❌ Erro ao verificar status da instância ${instance.instance_name}:`, error)
        results.push({
          instance_name: instance.instance_name,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Sincronização concluída. ${updatedCount} instâncias atualizadas.`,
      total_instances: instances.length,
      updated_count: updatedCount,
      details: results
    })
    
  } catch (error: any) {
    console.error('Erro ao sincronizar status das instâncias:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
} 