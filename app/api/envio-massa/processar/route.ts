import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"
import { getConfiguracao } from "@/lib/configuracoes"
import { EvolutionAPIService } from "@/lib/evolution-api"

interface CampanhaAtiva {
  id: number
  nome: string
  template_id: number
  instancia_id: number
  intervalo_segundos: number
  total_clientes: number
  enviados: number
  template_conteudo: string
  message_type: string
  instance_name: string
  instancia_status: string
}

interface EnvioPendente {
  id: number
  cliente_id: number
  cliente_nome: string
  cliente_telefone: string
  data_vencimento: string
  plano_nome: string
}

interface ProcessamentoResult {
  success: boolean
  message: string
  processadas: number
}

// Motor básico de envio em massa
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar campanhas que estão em status "enviando"
    const campanhas = await executeQuery(`
      SELECT 
        c.id,
        c.nome,
        c.template_id,
        c.instancia_id,
        c.intervalo_segundos,
        c.total_clientes,
        c.enviados,
        mt.mensagem as template_conteudo,
        mt.message_type,
        ei.instance_name,
        ei.status as instancia_status
      FROM campanhas_envio_massa c
      LEFT JOIN message_templates mt ON c.template_id = mt.id
      LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
      WHERE c.status = 'enviando'
      ORDER BY c.data_inicio ASC
      LIMIT 5
    `) as CampanhaAtiva[]

    if (!campanhas || campanhas.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma campanha em andamento",
        processadas: 0
      } as ProcessamentoResult)
    }

    let totalProcessadas = 0

    // Processar cada campanha
    for (const campanha of campanhas) {
      try {
        // Verificar se a instância ainda está conectada
        if (!['conectada', 'connected'].includes(campanha.instancia_status)) {
          console.log(`Instância ${campanha.instance_name} não está conectada. Pausando campanha ${campanha.id}`)
          
          await executeQuery(`
            UPDATE campanhas_envio_massa 
            SET status = 'pausada'
            WHERE id = ?
          `, [campanha.id])
          
          continue
        }

        // Buscar próximos envios pendentes (lote de 10)
        const enviosPendentes = await executeQuery(`
          SELECT 
            emd.id,
            emd.cliente_id,
            c.nome as cliente_nome,
            c.whatsapp as cliente_telefone,
            c.data_vencimento,
            p.nome as plano_nome
          FROM envios_massa_detalhes emd
          LEFT JOIN clientes c ON emd.cliente_id = c.id
          LEFT JOIN planos p ON c.plano_id = p.id
          WHERE emd.campanha_id = ? AND emd.status = 'pendente'
          ORDER BY emd.id ASC
          LIMIT 10
        `, [campanha.id]) as EnvioPendente[]

        if (!enviosPendentes || enviosPendentes.length === 0) {
          // Campanha concluída
          await finalizarCampanha(campanha.id)
          continue
        }

        // Processar cada envio
        for (const envio of enviosPendentes) {
          try {
            // Personalizar mensagem com dados do cliente
            const mensagemPersonalizada = personalizarMensagem(
              campanha.template_conteudo,
              {
                nome: envio.cliente_nome,
                telefone: envio.cliente_telefone,
                vencimento: envio.data_vencimento,
                plano: envio.plano_nome
              }
            )

            // Enviar mensagem via Evolution API
            const resultadoEnvio = await enviarMensagemWhatsApp(
              campanha.instance_name,
              envio.cliente_telefone,
              mensagemPersonalizada,
              campanha.message_type
            )

            if (resultadoEnvio.success) {
              // Marcar como enviado
              await executeQuery(`
                UPDATE envios_massa_detalhes 
                SET 
                  status = 'enviado',
                  mensagem_enviada = ?,
                  data_envio = NOW()
                WHERE id = ?
              `, [mensagemPersonalizada, envio.id])

              // Atualizar contador da campanha
              await executeQuery(`
                UPDATE campanhas_envio_massa 
                SET 
                  enviados = enviados + 1,
                  sucessos = sucessos + 1
                WHERE id = ?
              `, [campanha.id])

            } else {
              // Marcar como erro
              await executeQuery(`
                UPDATE envios_massa_detalhes 
                SET 
                  status = 'erro',
                  erro_detalhes = ?,
                  tentativas = tentativas + 1
                WHERE id = ?
              `, [resultadoEnvio.error, envio.id])

              // Atualizar contador de falhas
              await executeQuery(`
                UPDATE campanhas_envio_massa 
                SET 
                  enviados = enviados + 1,
                  falhas = falhas + 1
                WHERE id = ?
              `, [campanha.id])
            }

            console.log(`Envio processado - Cliente: ${envio.cliente_nome}, Status: ${resultadoEnvio.success ? 'sucesso' : 'erro'}`)

            // Aguardar intervalo configurado antes do próximo envio
            if (campanha.intervalo_segundos > 0) {
              await new Promise(resolve => setTimeout(resolve, campanha.intervalo_segundos * 1000))
            }

          } catch (envioError) {
            console.error(`Erro ao processar envio ${envio.id}:`, envioError)
            
            // Marcar como erro
            await executeQuery(`
              UPDATE envios_massa_detalhes 
              SET 
                status = 'erro',
                erro_detalhes = ?,
                tentativas = tentativas + 1
              WHERE id = ?
            `, [String(envioError), envio.id])
          }
        }

        totalProcessadas++

      } catch (campanhaError) {
        console.error(`Erro ao processar campanha ${campanha.id}:`, campanhaError)
        
        // Pausar campanha com erro
        await executeQuery(`
          UPDATE campanhas_envio_massa 
          SET status = 'erro'
          WHERE id = ?
        `, [campanha.id])
      }
    }

    return NextResponse.json({
      success: true,
      message: `${totalProcessadas} campanhas processadas`,
      processadas: totalProcessadas
    } as ProcessamentoResult)

  } catch (error) {
    console.error("Erro ao processar envios:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// Função para personalizar mensagem com dados do cliente
function personalizarMensagem(template: string, dados: any): string {
  let mensagem = template

  // Substituir variáveis comuns
  mensagem = mensagem.replace(/\{nome\}/g, dados.nome || '')
  mensagem = mensagem.replace(/\{telefone\}/g, dados.telefone || '')
  mensagem = mensagem.replace(/\{plano\}/g, dados.plano || '')
  
  // Formatar data de vencimento
  if (dados.vencimento) {
    const dataVencimento = new Date(dados.vencimento)
    const dataFormatada = dataVencimento.toLocaleDateString('pt-BR')
    mensagem = mensagem.replace(/\{vencimento\}/g, dataFormatada)
  }

  return mensagem
}

// Função para enviar mensagem via Evolution API
async function enviarMensagemWhatsApp(
  instanceName: string,
  telefone: string,
  mensagem: string,
  messageType: string = 'text'
): Promise<{ success: boolean; error?: string }> {
  try {
    const evolutionService = new EvolutionAPIService()

    // Formatar número do telefone (remover caracteres não numéricos)
    const numeroFormatado = telefone.replace(/\D/g, '')

    console.log(`📤 Enviando mensagem para ${numeroFormatado} via instância ${instanceName}`)
    console.log(`📦 Mensagem:`, mensagem)
    console.log(`🔤 Tipo:`, messageType)

    let response
    switch (messageType.toLowerCase()) {
      case 'text':
        response = await evolutionService.sendTextMessage(instanceName, numeroFormatado, mensagem)
        break
      
      case 'image':
        // Assumindo que a mensagem contém a URL da imagem e legenda separados por |
        const [imageUrl, caption] = mensagem.split('|')
        response = await evolutionService.sendImageMessage(instanceName, numeroFormatado, imageUrl, caption)
        break

      default:
        throw new Error(`Tipo de mensagem não suportado: ${messageType}`)
    }

    console.log(`✅ Mensagem enviada com sucesso:`, response)
    return { success: true }

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error)
    return { 
      success: false, 
      error: String(error) 
    }
  }
}

// Função para finalizar campanha
async function finalizarCampanha(campanhaId: number): Promise<void> {
  await executeQuery(`
    UPDATE campanhas_envio_massa 
    SET 
      status = 'concluida',
      data_conclusao = NOW()
    WHERE id = ?
  `, [campanhaId])

  console.log(`Campanha ${campanhaId} finalizada`)
} 