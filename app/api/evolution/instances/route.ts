import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { executeQuery } from '@/lib/db'
import { RowDataPacket, OkPacket } from 'mysql2'
import evolutionApiService from '@/lib/evolution-api'

/**
 * GET - Listar todas as instâncias
 */
export async function GET() {
  try {
    await verifyEvolutionPermissions()
    
    // Buscar instâncias do banco local
    const localInstances = await executeQuery(`
      SELECT 
        id,
        nome,
        instance_name,
        status,
        qr_code,
        webhook_url,
        created_at,
        updated_at
      FROM evolution_instancias 
      ORDER BY created_at DESC
    `) as RowDataPacket[]
    
    // Buscar status atualizado da Evolution API
    const instancesWithStatus = await Promise.all(
      localInstances.map(async (instance) => {
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
          }
          
          console.log(`📊 Status da instância ${instance.instance_name}: ${currentStatus} -> ${mappedStatus}`)
          
          // Atualizar status no banco se mudou
          if (mappedStatus !== instance.status) {
            console.log(`🔄 Atualizando status no banco: ${instance.status} -> ${mappedStatus}`)
            await executeQuery(
              'UPDATE evolution_instancias SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [mappedStatus, instance.id]
            )
          }
          
          return {
            ...instance,
            status: mappedStatus,
            qr_code: instance.qr_code ? JSON.parse(instance.qr_code) : null
          }
        } catch (error) {
          console.error(`❌ Erro ao buscar status da instância ${instance.instance_name}:`, error)
          return {
            ...instance,
            status: 'erro',
            qr_code: instance.qr_code ? JSON.parse(instance.qr_code) : null
          }
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      instancias: instancesWithStatus,
      total: instancesWithStatus.length
    })
  } catch (error: any) {
    console.error('Erro ao listar instâncias:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
}

/**
 * POST - Criar nova instância
 */
export async function POST(request: NextRequest) {
  try {
    await verifyEvolutionPermissions()
    
    const body = await request.json()
    const { nome, instance_name, webhook_url } = body
    
    // Validar dados obrigatórios
    if (!nome || !instance_name) {
      return NextResponse.json(
        { error: 'Nome e nome da instância são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Validar se o nome da instância é único
    const existingInstance = await executeQuery(
      'SELECT id FROM evolution_instancias WHERE instance_name = ?',
      [instance_name]
    ) as RowDataPacket[]
    
    if (existingInstance.length > 0) {
      return NextResponse.json(
        { error: 'Nome da instância já está em uso' },
        { status: 400 }
      )
    }
    
    // Inserir no banco local primeiro
    const insertResult = await executeQuery(`
      INSERT INTO evolution_instancias (
        nome, 
        instance_name, 
        status, 
        webhook_url,
        created_at,
        updated_at
      ) VALUES (?, ?, 'criando', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [nome, instance_name, webhook_url || null]) as OkPacket
    
    const instanceId = insertResult.insertId
    
    try {
      // Criar instância na Evolution API
      const evolutionInstance = await evolutionApiService.createInstance(
        instance_name,
        webhook_url
      )
      
      // Aguardar um pouco para a instância ser processada
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Tentar buscar QR Code e status atualizados
      let qrCode = null
      let currentStatus = evolutionInstance.status || 'desconectada'
      
      try {
        // Buscar QR Code se a instância estiver desconectada
        if (currentStatus === 'close' || currentStatus === 'connecting' || currentStatus === 'creating') {
          qrCode = await evolutionApiService.getQRCode(instance_name)
        }
        
        // Buscar status atual
        currentStatus = await evolutionApiService.getInstanceStatus(instance_name)
      } catch (qrError) {
        console.log('Erro ao buscar QR Code inicial:', qrError)
      }
      
      // Mapear status para formato do banco
      let mappedStatus: string = 'desconectada' // fallback padrão
      if (currentStatus === 'open') {
        mappedStatus = 'conectada'
      } else if (currentStatus === 'close') {
        mappedStatus = 'desconectada'
      } else if (currentStatus === 'connecting') {
        mappedStatus = 'conectando'
      } else if (currentStatus === 'creating') {
        mappedStatus = 'criando'
      }
      
      // Atualizar dados no banco
      await executeQuery(`
        UPDATE evolution_instancias 
        SET 
          status = ?,
          api_key = ?,
          qr_code = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        mappedStatus as any,
        evolutionInstance.apikey || null,
        qrCode ? JSON.stringify({ base64: qrCode }) : null,
        instanceId
      ])
      
      // Buscar instância criada
      const createdInstance = await executeQuery(
        'SELECT * FROM evolution_instancias WHERE id = ?',
        [instanceId]
      ) as RowDataPacket[]
      
      return NextResponse.json({
        message: 'Instância criada com sucesso',
        instance: {
          ...createdInstance[0],
          status: currentStatus,
          qr_code: qrCode ? { base64: qrCode } : null
        }
      }, { status: 201 })
      
    } catch (evolutionError: any) {
      // Se falhar na Evolution API, remover do banco local
      await executeQuery('DELETE FROM evolution_instancias WHERE id = ?', [instanceId])
      
      console.error('Erro ao criar instância na Evolution API:', evolutionError)
      return NextResponse.json(
        { error: evolutionError.message || 'Falha ao criar instância no WhatsApp' },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('Erro ao criar instância:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
} 