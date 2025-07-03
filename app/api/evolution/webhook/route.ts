import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

/**
 * POST - Webhook para receber eventos da Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, instance, data } = body
    
    console.log('Webhook Evolution recebido:', {
      event,
      instance,
      data: JSON.stringify(data, null, 2)
    })
    
    // Processar diferentes tipos de eventos
    switch (event) {
      case 'QRCODE_UPDATED':
        await handleQRCodeUpdated(instance, data)
        break
        
      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(instance, data)
        break
        
      case 'MESSAGES_UPSERT':
        await handleMessageUpsert(instance, data)
        break
        
      case 'SEND_MESSAGE':
        await handleSendMessage(instance, data)
        break
        
      case 'APPLICATION_STARTUP':
        await handleApplicationStartup(instance, data)
        break
        
      default:
        console.log(`Evento não processado: ${event}`)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      event,
      instance 
    })
    
  } catch (error: any) {
    console.error('Erro ao processar webhook Evolution:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao processar webhook',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * Processa atualização de QR Code
 */
async function handleQRCodeUpdated(instance: string, data: any) {
  try {
    if (data.qrcode) {
      await executeQuery(`
        UPDATE evolution_instancias 
        SET 
          qr_code = ?,
          status = 'desconectada',
          updated_at = CURRENT_TIMESTAMP
        WHERE instance_name = ?
      `, [
        JSON.stringify({ base64: data.qrcode }),
        instance
      ])
      
      console.log(`QR Code atualizado para instância: ${instance}`)
    }
  } catch (error) {
    console.error('Erro ao atualizar QR Code:', error)
  }
}

/**
 * Processa mudanças na conexão
 */
async function handleConnectionUpdate(instance: string, data: any) {
  try {
    let status = 'desconectada'
    
    // Mapear status da Evolution para nosso formato
    switch (data.state) {
      case 'open':
        status = 'conectada'
        break
      case 'close':
        status = 'desconectada'
        break
      case 'connecting':
        status = 'connecting'
        break
      default:
        status = 'erro'
    }
    
    // Se conectou com sucesso, limpar QR code
    let qrCodeUpdate = ''
    if (status === 'conectada') {
      qrCodeUpdate = ', qr_code = NULL'
    }
    
    await executeQuery(`
      UPDATE evolution_instancias 
      SET 
        status = ?${qrCodeUpdate},
        updated_at = CURRENT_TIMESTAMP
      WHERE instance_name = ?
    `, [status, instance])
    
    console.log(`Status da instância ${instance} atualizado para: ${status}`)
    
  } catch (error) {
    console.error('Erro ao atualizar status da conexão:', error)
  }
}

/**
 * Processa mensagens recebidas
 */
async function handleMessageUpsert(instance: string, data: any) {
  try {
    // Log das mensagens recebidas para debug
    console.log(`Mensagem recebida na instância ${instance}:`, data)
    
    // Aqui podemos implementar lógica para processar mensagens recebidas
    // Por exemplo, responder automaticamente, logs específicos, etc.
    
  } catch (error) {
    console.error('Erro ao processar mensagem recebida:', error)
  }
}

/**
 * Processa confirmação de envio de mensagem
 */
async function handleSendMessage(instance: string, data: any) {
  try {
    // Buscar mensagem no histórico pelo ID da mensagem
    if (data.key && data.key.id) {
      const messageHistory = await executeQuery(`
        SELECT h.id 
        FROM message_history h
        JOIN evolution_instancias i ON h.instancia_id = i.id
        WHERE i.instance_name = ?
          AND JSON_EXTRACT(h.response_data, '$.key.id') = ?
        ORDER BY h.created_at DESC
        LIMIT 1
      `, [instance, data.key.id]) as RowDataPacket[]
      
      if (messageHistory.length > 0) {
        // Atualizar status baseado no status da mensagem
        let newStatus = 'enviada'
        if (data.status === 'READ') {
          newStatus = 'lida'
        } else if (data.status === 'RECEIVED') {
          newStatus = 'enviada'
        }
        
        await executeQuery(`
          UPDATE message_history 
          SET 
            status = ?,
            response_data = ?
          WHERE id = ?
        `, [
          newStatus,
          JSON.stringify(data),
          messageHistory[0].id
        ])
        
        console.log(`Status da mensagem ${data.key.id} atualizado para: ${newStatus}`)
      }
    }
    
  } catch (error) {
    console.error('Erro ao processar confirmação de envio:', error)
  }
}

/**
 * Processa inicialização da aplicação
 */
async function handleApplicationStartup(instance: string, data: any) {
  try {
    console.log(`Instância ${instance} iniciada:`, data)
    
    // Atualizar informações da instância se necessário
    await executeQuery(`
      UPDATE evolution_instancias 
      SET updated_at = CURRENT_TIMESTAMP
      WHERE instance_name = ?
    `, [instance])
    
  } catch (error) {
    console.error('Erro ao processar startup da aplicação:', error)
  }
}

/**
 * GET - Endpoint para verificar se webhook está funcionando
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook Evolution API está funcionando',
    timestamp: new Date().toISOString()
  })
} 