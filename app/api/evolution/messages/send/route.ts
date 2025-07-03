import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { executeQuery } from '@/lib/db'
import { RowDataPacket, OkPacket } from 'mysql2'
import evolutionApiService from '@/lib/evolution-api'
import { 
  getTemplateById, 
  getClienteDataForTemplate, 
  processTemplate 
} from '@/lib/whatsapp-templates'

/**
 * POST - Enviar mensagem WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    await verifyEvolutionPermissions()
    
    const body = await request.json()
    const {
      cliente_id,
      clienteId,
      template_id,
      templateId,
      instance_id,
      instanceId,
      mensagem_customizada,
      customMessage,
      numero_customizado
    } = body
    
    // Normalizar nomes (aceitar tanto snake_case quanto camelCase)
    const finalClienteId = cliente_id || clienteId
    const finalTemplateId = template_id || templateId
    const finalInstanceId = instance_id || instanceId
    const finalMensagemCustomizada = mensagem_customizada || customMessage
    
    // Validar dados obrigatórios
    if (!finalClienteId && !numero_customizado) {
      return NextResponse.json(
        { error: 'ID do cliente ou número customizado é obrigatório' },
        { status: 400 }
      )
    }
    
    if (!finalInstanceId) {
      return NextResponse.json(
        { error: 'ID da instância é obrigatório' },
        { status: 400 }
      )
    }
    
    // Buscar dados da instância
    const instanceData = await executeQuery(
      'SELECT * FROM evolution_instancias WHERE id = ?',
      [finalInstanceId]
    ) as RowDataPacket[]
    
    if (instanceData.length === 0) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }
    
    const instance = instanceData[0]
    
    // Verificar se instância está conectada
    if (instance.status !== 'conectada' && instance.status !== 'open') {
      return NextResponse.json(
        { error: 'Instância não está conectada' },
        { status: 400 }
      )
    }
    
    let clienteData = null
    let numeroWhatsApp = numero_customizado
    
    // Se for envio para cliente específico, buscar dados
    if (finalClienteId) {
      clienteData = await getClienteDataForTemplate(finalClienteId)
      if (!clienteData) {
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 404 }
        )
      }
      
      if (!clienteData.whatsapp) {
        return NextResponse.json(
          { error: 'Cliente não possui WhatsApp cadastrado' },
          { status: 400 }
        )
      }
      
      numeroWhatsApp = clienteData.whatsapp
    }
    
    let mensagemFinal = finalMensagemCustomizada || ''
    let imagemUrl: string | undefined
    let imagemCaption: string | undefined
    let messageType: 'texto' | 'imagem' = 'texto'
    let templateUsado = null
    
    // Se usar template, processar com variáveis
    if (finalTemplateId) {
      const template = await getTemplateById(finalTemplateId)
      if (!template) {
        return NextResponse.json(
          { error: 'Template não encontrado' },
          { status: 404 }
        )
      }
      
      if (!template.ativo) {
        return NextResponse.json(
          { error: 'Template não está ativo' },
          { status: 400 }
        )
      }
      
      templateUsado = template
      messageType = template.message_type
      
      if (clienteData) {
        // Processar template com dados do cliente
        const processedTemplate = await processTemplate(template, clienteData)
        mensagemFinal = processedTemplate.texto
        imagemCaption = processedTemplate.imagemCaption
      } else {
        // Usar template sem processamento de variáveis
        mensagemFinal = template.mensagem
        imagemCaption = template.imagem_caption || undefined
      }
      
      if (template.message_type === 'imagem') {
        imagemUrl = template.imagem_url || undefined
      }
    }
    
    if (!mensagemFinal && !imagemUrl) {
      return NextResponse.json(
        { error: 'Mensagem ou imagem é obrigatória' },
        { status: 400 }
      )
    }
    
    try {
      // Registrar tentativa no histórico
      const historyInsert = await executeQuery(`
        INSERT INTO message_history (
          cliente_id,
          instancia_id,
          template_id,
          numero_whatsapp,
          message_type,
          mensagem_enviada,
          imagem_enviada,
          status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'enviando', CURRENT_TIMESTAMP)
      `, [
        finalClienteId || null,
        finalInstanceId,
        finalTemplateId || null,
        numeroWhatsApp,
        messageType,
        mensagemFinal,
        imagemUrl || null
      ]) as OkPacket
      
      const historyId = historyInsert.insertId
      
      // Enviar mensagem via Evolution API
      let sendResponse
      
      if (messageType === 'imagem' && imagemUrl) {
        sendResponse = await evolutionApiService.sendImageMessage(
          instance.instance_name,
          numeroWhatsApp,
          imagemUrl,
          imagemCaption || mensagemFinal
        )
      } else {
        sendResponse = await evolutionApiService.sendTextMessage(
          instance.instance_name,
          numeroWhatsApp,
          mensagemFinal
        )
      }
      
      // Atualizar histórico com sucesso
      await executeQuery(`
        UPDATE message_history 
        SET 
          status = 'enviada',
          response_data = ?,
          error_message = NULL
        WHERE id = ?
      `, [
        JSON.stringify(sendResponse),
        historyId
      ])
      
      return NextResponse.json({
        message: 'Mensagem enviada com sucesso',
        message_id: sendResponse.key?.id,
        history_id: historyId,
        send_response: sendResponse
      })
      
    } catch (sendError: any) {
      console.error('Erro ao enviar mensagem:', sendError)
      
      // Atualizar histórico com erro
      if (historyId) {
        await executeQuery(`
          UPDATE message_history 
          SET 
            status = 'erro',
            error_message = ?
          WHERE id = ?
        `, [
          sendError.message || 'Erro ao enviar mensagem',
          historyId
        ])
      }
      
      return NextResponse.json(
        { error: sendError.message || 'Falha ao enviar mensagem' },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('Erro ao processar envio de mensagem:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
} 