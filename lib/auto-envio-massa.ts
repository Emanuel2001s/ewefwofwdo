import { executeQuery } from './db'
import { EvolutionAPIService } from './evolution-api'
import { processTemplate, type MessageTemplate, type ClienteData } from './whatsapp-templates'

const MAX_RETRIES = 3 // Máximo de tentativas por envio

export async function processarEnvioMassa(campanhaId: number) {
  let processando = true

  while (processando) {
    try {
      // Verificar status atual da campanha
      const [statusAtual] = await executeQuery(`
        SELECT 
          status, 
          intervalo_segundos,
          DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') as hora_atual 
        FROM campanhas_envio_massa 
        WHERE id = ?
      `, [campanhaId]) as any[]

      console.log(`[DEBUG] Status atual da campanha ${campanhaId}:`, statusAtual?.status)
      console.log(`[DEBUG] Hora atual do banco:`, statusAtual?.hora_atual)

      // Se a campanha não estiver em status 'enviando', não prosseguir
      if (!statusAtual || statusAtual.status !== 'enviando') {
        console.log(`Campanha ${campanhaId} não está em status 'enviando'. Status atual: ${statusAtual?.status}`)
        processando = false
        return
      }

      // Usar o intervalo configurado na tabela (em segundos) ou 10 segundos como padrão
      const intervaloEnvio = (statusAtual.intervalo_segundos || 10) * 1000 // Converter para milissegundos

      // Buscar dados da campanha
      const [campanha] = await executeQuery(`
        SELECT
          c.*,
          mt.mensagem as template_mensagem,
          mt.message_type as template_type,
          mt.imagem_url as template_imagem_url,
          mt.imagem_caption as template_imagem_caption,
          ei.instance_name as instancia_nome,
          ei.status as instancia_status,
          DATE_FORMAT(c.data_inicio, '%Y-%m-%d %H:%i:%s') as data_inicio_formatada,
          DATE_FORMAT(c.data_conclusao, '%Y-%m-%d %H:%i:%s') as data_conclusao_formatada
        FROM campanhas_envio_massa c
        LEFT JOIN message_templates mt ON c.template_id = mt.id
        LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
        WHERE c.id = ?
      `, [campanhaId]) as any

      if (!campanha) {
        throw new Error("Campanha não encontrada")
      }

      // Verificar se a instância está conectada
      if (!['conectada', 'connected'].includes(campanha.instancia_status)) {
        await executeQuery(`
          UPDATE campanhas_envio_massa
          SET status = 'pausada'
          WHERE id = ?
        `, [campanhaId])
        console.log(`Campanha ${campanhaId} pausada - instância não está conectada`)
        processando = false
        return
      }

      // Verificar se ainda existem envios pendentes
      const [{ total_pendentes }] = await executeQuery(`
        SELECT COUNT(*) as total_pendentes
        FROM envios_massa_detalhes
        WHERE campanha_id = ? AND status = 'pendente'
      `, [campanhaId]) as any[]

      console.log(`[DEBUG] Total de envios pendentes para campanha ${campanhaId}: ${total_pendentes}`)

      if (total_pendentes === 0) {
        // Não há mais envios pendentes, marcar campanha como concluída
        await executeQuery(`
          UPDATE campanhas_envio_massa
          SET
            status = 'concluida',
            data_conclusao = NOW()
          WHERE id = ?
        `, [campanhaId])
        console.log(`Campanha ${campanhaId} concluída - todos os envios processados`)
        processando = false
        return
      }

      // Buscar próximo envio pendente
      const [envio] = await executeQuery(`
        SELECT 
          emd.*,
          c.nome as cliente_nome,
          c.whatsapp,
          c.usuario,
          c.status as cliente_status,
          c.data_vencimento,
          c.data_ativacao,
          c.plano_id,
          c.servidor_id,
          p.nome as plano,
          p.valor as valor_plano,
          s.nome as servidor
        FROM envios_massa_detalhes emd
        LEFT JOIN clientes c ON emd.cliente_id = c.id
        LEFT JOIN planos p ON c.plano_id = p.id
        LEFT JOIN servidores s ON c.servidor_id = s.id
        WHERE emd.campanha_id = ? 
        AND emd.status = 'pendente'
        AND emd.tentativas < ?
        ORDER BY emd.tentativas ASC, emd.id ASC
        LIMIT 1
      `, [campanhaId, MAX_RETRIES]) as any

      if (!envio) {
        console.log(`[DEBUG] Nenhum envio pendente encontrado para campanha ${campanhaId}`)
        continue
      }

      console.log(`[DEBUG] Processando envio ${envio.id} para campanha ${campanhaId}:
        - Cliente: ${envio.cliente_nome}
        - WhatsApp: ${envio.whatsapp}
        - Tentativa: ${envio.tentativas + 1}/${MAX_RETRIES}
        - Status atual: ${envio.status}`)

      // Preparar dados do cliente para o template
      const clienteData: ClienteData = {
        id: envio.cliente_id,
        nome: envio.cliente_nome || '',
        whatsapp: envio.whatsapp || '',
        usuario: envio.usuario || '',
        status: envio.cliente_status || '',
        data_vencimento: envio.data_vencimento || new Date().toISOString(),
        data_ativacao: envio.data_ativacao || new Date().toISOString(),
        plano: envio.plano || '',
        valor_plano: envio.valor_plano || 0,
        servidor: envio.servidor || ''
      }

      // Preparar template
      const template: MessageTemplate = {
        id: 0,
        nome: 'Campanha',
        tipo: 'personalizada',
        message_type: campanha.template_type,
        mensagem: campanha.template_mensagem,
        imagem_url: campanha.template_imagem_url,
        imagem_caption: campanha.template_imagem_caption,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      let envioSucesso = false
      let mensagemErro = ''
      let messageId = ''
      let mensagemProcessada: { texto: string; imagemCaption?: string } = { texto: '' }

      try {
        // Processar template com dados do cliente e enviar mensagem
        const evolutionAPI = new EvolutionAPIService()
        mensagemProcessada = await processTemplate(template, clienteData)
        
        // Validar e formatar número de telefone
        let numeroFormatado = envio.whatsapp.replace(/\D/g, '')
        
        // Remover o 0 inicial se houver
        if (numeroFormatado.startsWith('0')) {
          numeroFormatado = numeroFormatado.substring(1)
        }
        
        // Adicionar código do país se necessário
        if (!numeroFormatado.startsWith('55')) {
          numeroFormatado = '55' + numeroFormatado
        }
        
        // Validar tamanho final do número
        if (numeroFormatado.length < 12 || numeroFormatado.length > 13) {
          throw new Error(`Número de telefone inválido: ${envio.whatsapp} (formatado: ${numeroFormatado})`)
        }
        
        console.log(`[DEBUG] Número original: ${envio.whatsapp}, formatado: ${numeroFormatado}`)

        let response: any
        
        // Enviar a mensagem
        console.log(`[DEBUG] Enviando mensagem ${campanha.template_type} via instância ${campanha.instancia_nome}`)
        
        if (campanha.template_type === 'texto') {
          response = await evolutionAPI.sendTextMessage(
            campanha.instancia_nome,
            numeroFormatado,
            mensagemProcessada.texto
          )
        } else if (campanha.template_type === 'imagem' && campanha.template_imagem_url) {
          response = await evolutionAPI.sendImageMessage(
            campanha.instancia_nome,
            numeroFormatado,
            campanha.template_imagem_url,
            mensagemProcessada.imagemCaption || ''
          )
        }

        if (response?.key) {
          messageId = response.key.id || response.key
          envioSucesso = true
          console.log(`[DEBUG] Mensagem enviada com sucesso. MessageID: ${messageId}`)
        } else {
          throw new Error('Resposta da API não contém message_id')
        }

      } catch (error: any) {
        mensagemErro = error.message
        console.error(`[DEBUG] Erro no envio para ${envio.whatsapp}:`, error)
      }

      // Atualizar status do envio no banco de dados
      if (envioSucesso) {
        await executeQuery(`
          UPDATE envios_massa_detalhes
          SET
            status = 'enviado',
            message_id = ?,
            mensagem_enviada = ?,
            data_envio = NOW()
          WHERE id = ?
          AND status = 'pendente'
        `, [messageId, mensagemProcessada.texto, envio.id])

        // Atualizar contadores da campanha
        await executeQuery(`
          UPDATE campanhas_envio_massa
          SET
            enviados = enviados + 1,
            sucessos = sucessos + 1
          WHERE id = ?
        `, [campanhaId])
      } else {
        const novoStatus = envio.tentativas + 1 >= MAX_RETRIES ? 'erro' : 'pendente'
        await executeQuery(`
          UPDATE envios_massa_detalhes
          SET
            status = ?,
            erro_mensagem = ?,
            tentativas = tentativas + 1,
            updated_at = NOW()
          WHERE id = ?
        `, [novoStatus, mensagemErro, envio.id])

        if (novoStatus === 'erro') {
          await executeQuery(`
            UPDATE campanhas_envio_massa
            SET
              enviados = enviados + 1,
              falhas = falhas + 1,
              updated_at = NOW()
            WHERE id = ?
          `, [campanhaId])
        }
      }

      // Aguardar intervalo configurado antes do próximo envio
      if (intervaloEnvio > 0) {
        console.log(`[DEBUG] Aguardando ${intervaloEnvio/1000} segundos antes do próximo envio`)
        await new Promise(resolve => setTimeout(resolve, intervaloEnvio))
      }

    } catch (error: any) {
      console.error("[DEBUG] Erro no processamento da campanha:", error)
      // Aguardar um intervalo antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
} 