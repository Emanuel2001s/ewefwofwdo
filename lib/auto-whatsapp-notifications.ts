"use server"

import { executeQuery } from './db'
import { RowDataPacket } from 'mysql2'
import evolutionApiService from './evolution-api'
import { 
  getClientesVencimentoProximo, 
  getTemplatesByTipo, 
  processTemplate 
} from './whatsapp-templates'

// Configurações padrão para notificações automáticas
const NOTIFICATION_CONFIG = {
  diasAntecedencia: 3, // Notificar 3 dias antes do vencimento
  templateTipo: 'vencimento',
  maxTentativas: 3, // Máximo de tentativas por cliente
  intervaloReTentativa: 60 * 60 * 1000 // 1 hora em milliseconds
}

/**
 * Executa o sistema automático de notificações de vencimento
 */
export async function executeAutoNotifications(): Promise<{
  success: boolean
  processed: number
  sent: number
  errors: number
  details: string[]
}> {
  const details: string[] = []
  let processed = 0
  let sent = 0
  let errors = 0
  
  try {
    details.push(`🚀 Iniciando sistema automático de notificações às ${new Date().toLocaleString('pt-BR')}`)
    
    // Verificar se há instâncias conectadas
    const connectedInstances = await getConnectedInstances()
    if (connectedInstances.length === 0) {
      details.push('❌ Nenhuma instância WhatsApp conectada encontrada')
      return {
        success: false,
        processed: 0,
        sent: 0,
        errors: 1,
        details
      }
    }
    
    details.push(`📱 ${connectedInstances.length} instância(s) conectada(s) encontrada(s)`)
    
    // Buscar templates de vencimento ativos
    const templates = await getTemplatesByTipo('vencimento')
    if (templates.length === 0) {
      details.push('❌ Nenhum template de vencimento ativo encontrado')
      return {
        success: false,
        processed: 0,
        sent: 0,
        errors: 1,
        details
      }
    }
    
    details.push(`📝 ${templates.length} template(s) de vencimento encontrado(s)`)
    
    // Buscar clientes com vencimento próximo
    const clientesVencimento = await getClientesVencimentoProximo(NOTIFICATION_CONFIG.diasAntecedencia)
    details.push(`👥 ${clientesVencimento.length} cliente(s) com vencimento nos próximos ${NOTIFICATION_CONFIG.diasAntecedencia} dias`)
    
    if (clientesVencimento.length === 0) {
      details.push('✅ Nenhum cliente com vencimento próximo')
      return {
        success: true,
        processed: 0,
        sent: 0,
        errors: 0,
        details
      }
    }
    
    // Usar a primeira instância conectada
    const instance = connectedInstances[0]
    details.push(`📲 Usando instância: ${instance.nome} (${instance.instance_name})`)
    
    // Usar o primeiro template ativo
    const template = templates[0]
    details.push(`📄 Usando template: ${template.nome}`)
    
    // Processar cada cliente
    for (const cliente of clientesVencimento) {
      processed++
      
      try {
        // Verificar se já foi enviada notificação hoje
        const jaEnviado = await checkIfAlreadySent(cliente.id, instance.id)
        if (jaEnviado) {
          details.push(`⏭️ Cliente ${cliente.nome}: Notificação já enviada hoje`)
          continue
        }
        
        // Processar template com dados do cliente
        const processedTemplate = await processTemplate(template, cliente)
        
        // Enviar mensagem
        let sendResponse
        if (template.message_type === 'imagem' && template.imagem_url) {
          sendResponse = await evolutionApiService.sendImageMessage(
            instance.instance_name,
            cliente.whatsapp,
            template.imagem_url,
            processedTemplate.imagemCaption || processedTemplate.texto
          )
        } else {
          sendResponse = await evolutionApiService.sendTextMessage(
            instance.instance_name,
            cliente.whatsapp,
            processedTemplate.texto
          )
        }
        
        // Registrar no histórico
        await executeQuery(`
          INSERT INTO message_history (
            cliente_id,
            instancia_id,
            template_id,
            numero_whatsapp,
            message_type,
            mensagem_enviada,
            imagem_enviada,
            status,
            response_data,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'enviada', ?, CURRENT_TIMESTAMP)
        `, [
          cliente.id,
          instance.id,
          template.id,
          cliente.whatsapp,
          template.message_type,
          processedTemplate.texto,
          template.imagem_url || null,
          JSON.stringify(sendResponse)
        ])
        
        sent++
        details.push(`✅ Cliente ${cliente.nome}: Notificação enviada com sucesso`)
        
        // Pequena pausa entre envios para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error: any) {
        errors++
        console.error(`Erro ao enviar notificação para ${cliente.nome}:`, error)
        details.push(`❌ Cliente ${cliente.nome}: Erro - ${error.message}`)
        
        // Registrar erro no histórico
        try {
          await executeQuery(`
            INSERT INTO message_history (
              cliente_id,
              instancia_id,
              template_id,
              numero_whatsapp,
              message_type,
              mensagem_enviada,
              status,
              error_message,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'erro', ?, CURRENT_TIMESTAMP)
          `, [
            cliente.id,
            instance.id,
            template.id,
            cliente.whatsapp,
            template.message_type,
            processedTemplate?.texto || 'Erro ao processar template',
            error.message
          ])
        } catch (logError) {
          console.error('Erro ao registrar falha no histórico:', logError)
        }
      }
    }
    
    details.push(`🏁 Processamento concluído: ${sent}/${processed} enviadas, ${errors} erros`)
    
    return {
      success: errors < processed, // Sucesso se não houve erros em todos
      processed,
      sent,
      errors,
      details
    }
    
  } catch (error: any) {
    console.error('Erro no sistema automático de notificações:', error)
    details.push(`💥 Erro geral: ${error.message}`)
    
    return {
      success: false,
      processed,
      sent,
      errors: errors + 1,
      details
    }
  }
}

/**
 * Busca instâncias conectadas disponíveis, priorizando a instância padrão
 */
async function getConnectedInstances() {
  try {
    const instances = await executeQuery(`
      SELECT id, nome, instance_name, status, is_default
      FROM evolution_instancias 
      WHERE status IN ('conectada', 'open')
      ORDER BY is_default DESC, updated_at DESC
    `) as RowDataPacket[]
    
    return instances
  } catch (error) {
    console.error('Erro ao buscar instâncias conectadas:', error)
    return []
  }
}

/**
 * Verifica se já foi enviada notificação para o cliente hoje
 */
async function checkIfAlreadySent(clienteId: number, instanciaId: number): Promise<boolean> {
  try {
    const result = await executeQuery(`
      SELECT COUNT(*) as count
      FROM message_history 
      WHERE cliente_id = ? 
        AND instancia_id = ?
        AND DATE(created_at) = CURDATE()
        AND status IN ('enviada', 'lida')
    `, [clienteId, instanciaId]) as RowDataPacket[]
    
    return result[0].count > 0
  } catch (error) {
    console.error('Erro ao verificar se mensagem já foi enviada:', error)
    return false
  }
}

/**
 * Busca estatísticas das notificações automáticas
 */
export async function getNotificationStats(dias: number = 7) {
  try {
    const stats = await executeQuery(`
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total_enviadas,
        SUM(CASE WHEN status = 'enviada' OR status = 'lida' THEN 1 ELSE 0 END) as sucessos,
        SUM(CASE WHEN status = 'erro' THEN 1 ELSE 0 END) as erros,
        COUNT(DISTINCT cliente_id) as clientes_notificados
      FROM message_history
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND template_id IN (SELECT id FROM message_templates WHERE tipo = 'vencimento')
      GROUP BY DATE(created_at)
      ORDER BY data DESC
    `, [dias]) as RowDataPacket[]
    
    return stats
  } catch (error) {
    console.error('Erro ao buscar estatísticas de notificações:', error)
    return []
  }
}

/**
 * Agenda notificação manual para cliente específico
 */
export async function scheduleManualNotification(
  clienteId: number, 
  templateId: number, 
  instanciaId: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Validar se cliente existe e tem WhatsApp
    const clienteData = await executeQuery(`
      SELECT id, nome, whatsapp
      FROM clientes 
      WHERE id = ? AND whatsapp IS NOT NULL AND whatsapp != ''
    `, [clienteId]) as RowDataPacket[]
    
    if (clienteData.length === 0) {
      return { success: false, message: 'Cliente não encontrado ou sem WhatsApp' }
    }
    
    // Validar template
    const templateData = await executeQuery(`
      SELECT id, nome, ativo
      FROM message_templates 
      WHERE id = ? AND ativo = TRUE
    `, [templateId]) as RowDataPacket[]
    
    if (templateData.length === 0) {
      return { success: false, message: 'Template não encontrado ou inativo' }
    }
    
    // Validar instância
    const instanciaData = await executeQuery(`
      SELECT id, nome, status
      FROM evolution_instancias 
      WHERE id = ? AND status IN ('conectada', 'open')
    `, [instanciaId]) as RowDataPacket[]
    
    if (instanciaData.length === 0) {
      return { success: false, message: 'Instância não encontrada ou desconectada' }
    }
    
    // Registrar agendamento (será processado pelo próximo ciclo)
    await executeQuery(`
      INSERT INTO message_history (
        cliente_id,
        instancia_id,
        template_id,
        numero_whatsapp,
        message_type,
        mensagem_enviada,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, 'texto', 'Notificação agendada manualmente', 'enviando', CURRENT_TIMESTAMP)
    `, [
      clienteId,
      instanciaId,
      templateId,
      clienteData[0].whatsapp
    ])
    
    return { 
      success: true, 
      message: `Notificação agendada para ${clienteData[0].nome}` 
    }
    
  } catch (error: any) {
    console.error('Erro ao agendar notificação manual:', error)
    return { 
      success: false, 
      message: error.message || 'Erro ao agendar notificação' 
    }
  }
} 