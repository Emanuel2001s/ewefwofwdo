import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { executeQuery } from '@/lib/db'
import { RowDataPacket } from 'mysql2'
import evolutionApiService from '@/lib/evolution-api'

/**
 * GET - Buscar detalhes de uma instância específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyEvolutionPermissions()
    
    const { id } = await params
    
    // Aceitar tanto ID numérico quanto instance_name
    const instanceId = parseInt(id)
    let localInstance: RowDataPacket[]
    
    if (isNaN(instanceId)) {
      // Se não for um número, assumir que é instance_name
      localInstance = await executeQuery(
        'SELECT * FROM evolution_instancias WHERE instance_name = ?',
        [id]
      ) as RowDataPacket[]
    } else {
      // Se for um número, buscar por ID
      localInstance = await executeQuery(
        'SELECT * FROM evolution_instancias WHERE id = ?',
        [instanceId]
      ) as RowDataPacket[]
    }
    
    if (localInstance.length === 0) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }
    
    const instance = localInstance[0]
    
    try {
      // Buscar informações atualizadas da Evolution API
      const evolutionInfo = await evolutionApiService.getInstanceInfo(instance.instance_name)
      const currentStatus = await evolutionApiService.getInstanceStatus(instance.instance_name)
      
      // Buscar QR Code se necessário
      let qrCode = null
      if (currentStatus === 'close' || currentStatus === 'connecting' || currentStatus === 'creating') {
        qrCode = await evolutionApiService.getQRCode(instance.instance_name)
        console.log(`QR Code para ${instance.instance_name}:`, qrCode ? 'Encontrado' : 'Não encontrado')
      }
      
      // Atualizar dados no banco se necessário
      const updateData: any = {}
      if (currentStatus !== instance.status) {
        updateData.status = currentStatus
      }
      if (qrCode && qrCode !== instance.qr_code) {
        updateData.qr_code = JSON.stringify({ base64: qrCode })
      }
      
      if (Object.keys(updateData).length > 0) {
        const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ')
        const values = Object.values(updateData)
        
        await executeQuery(
          `UPDATE evolution_instancias SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [...values, instance.id]
        )
      }
      
      // Preparar QR Code para resposta
      let responseQrCode = null
      if (qrCode) {
        responseQrCode = { base64: qrCode }
      } else if (instance.qr_code) {
        try {
          responseQrCode = JSON.parse(instance.qr_code)
        } catch (parseError) {
          console.log('Erro ao fazer parse do QR Code salvo:', parseError)
        }
      }
      
      return NextResponse.json({
        instance: {
          ...instance,
          status: currentStatus,
          qr_code: responseQrCode,
          evolution_info: evolutionInfo
        }
      })
      
    } catch (evolutionError) {
      console.error('Erro ao buscar informações da Evolution API:', evolutionError)
      
      // Retornar dados locais mesmo com erro na Evolution API
      return NextResponse.json({
        instance: {
          ...instance,
          qr_code: instance.qr_code ? JSON.parse(instance.qr_code) : null,
          evolution_api_error: true
        }
      })
    }
    
  } catch (error: any) {
    console.error('Erro ao buscar instância:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
}

/**
 * DELETE - Excluir instância
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyEvolutionPermissions()
    
    const { id } = await params
    
    // Aceitar tanto ID numérico quanto instance_name
    const instanceId = parseInt(id)
    let localInstance: RowDataPacket[]
    
    if (isNaN(instanceId)) {
      // Se não for um número, assumir que é instance_name
      localInstance = await executeQuery(
        'SELECT * FROM evolution_instancias WHERE instance_name = ?',
        [id]
      ) as RowDataPacket[]
    } else {
      // Se for um número, buscar por ID
      localInstance = await executeQuery(
        'SELECT * FROM evolution_instancias WHERE id = ?',
        [instanceId]
      ) as RowDataPacket[]
    }
    
    if (localInstance.length === 0) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }
    
    const instance = localInstance[0]
    
    try {
      // Excluir da Evolution API primeiro
      await evolutionApiService.deleteInstance(instance.instance_name)
    } catch (evolutionError) {
      console.error('Erro ao excluir instância da Evolution API:', evolutionError)
      // Continuar mesmo com erro na Evolution API
    }
    
    // Excluir do banco local
    await executeQuery('DELETE FROM evolution_instancias WHERE id = ?', [instance.id])
    
    return NextResponse.json({
      message: 'Instância excluída com sucesso'
    })
    
  } catch (error: any) {
    console.error('Erro ao excluir instância:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
}

/**
 * PUT - Atualizar instância (restart, logout, etc)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyEvolutionPermissions()
    
    const { id } = await params
    const body = await request.json()
    const { action } = body
    
    // Aceitar tanto ID numérico quanto instance_name
    const instanceId = parseInt(id)
    let localInstance: RowDataPacket[]
    
    if (isNaN(instanceId)) {
      // Se não for um número, assumir que é instance_name
      localInstance = await executeQuery(
        'SELECT * FROM evolution_instancias WHERE instance_name = ?',
        [id]
      ) as RowDataPacket[]
    } else {
      // Se for um número, buscar por ID
      localInstance = await executeQuery(
        'SELECT * FROM evolution_instancias WHERE id = ?',
        [instanceId]
      ) as RowDataPacket[]
    }
    
    if (localInstance.length === 0) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }
    
    const instance = localInstance[0]
    
    try {
      let result = false
      let message = ''
      
      switch (action) {
        case 'restart':
          result = await evolutionApiService.restartInstance(instance.instance_name)
          message = 'Instância reiniciada com sucesso'
          break
          
        case 'logout':
          result = await evolutionApiService.logoutInstance(instance.instance_name)
          message = 'Instância desconectada com sucesso'
          break
          
        case 'connect':
          result = await evolutionApiService.connectInstanceForQR(instance.instance_name)
          message = 'Conexão iniciada - QR Code sendo gerado'
          
          // Aguardar um pouco para a Evolution API processar
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Buscar QR Code e status atualizados
          try {
            const qrCode = await evolutionApiService.getQRCode(instance.instance_name)
            const currentStatus = await evolutionApiService.getInstanceStatus(instance.instance_name)
            
            console.log(`Status após conectar ${instance.instance_name}: ${currentStatus}`)
            console.log(`QR Code após conectar ${instance.instance_name}: ${qrCode ? 'Disponível' : 'Não disponível'}`)
            
            // Atualizar dados no banco
            if (qrCode || currentStatus !== instance.status) {
              const updateData: any = { status: currentStatus }
              if (qrCode) {
                updateData.qr_code = JSON.stringify({ base64: qrCode })
              }
              
              const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ')
              const values = Object.values(updateData)
              
              await executeQuery(
                `UPDATE evolution_instancias SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [...values, instance.id]
              )
            }
            
            if (qrCode) {
              message = 'Instância conectada - QR Code disponível'
            }
          } catch (qrError) {
            console.error('Erro ao buscar QR Code após conectar:', qrError)
          }
          break
          
        default:
          return NextResponse.json(
            { error: 'Ação inválida. Use: restart, logout, connect' },
            { status: 400 }
          )
      }
      
      if (result) {
        // Atualizar status no banco
        let newStatus = 'connecting'
        if (action === 'logout') {
          newStatus = 'desconectada'
        } else if (action === 'connect') {
          newStatus = 'connecting'
        }
        
        await executeQuery(
          'UPDATE evolution_instancias SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newStatus, instance.id]
        )
        
        return NextResponse.json({
          message,
          action_performed: action
        })
      } else {
        return NextResponse.json(
          { error: `Falha ao executar ação: ${action}` },
          { status: 500 }
        )
      }
      
    } catch (evolutionError: any) {
      console.error('Erro ao executar ação na Evolution API:', evolutionError)
      return NextResponse.json(
        { error: evolutionError.message || `Falha ao executar ação: ${action}` },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('Erro ao atualizar instância:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
} 