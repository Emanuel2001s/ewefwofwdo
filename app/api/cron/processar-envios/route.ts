import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { EvolutionAPIService } from "@/lib/evolution-api"

const evolutionAPI = new EvolutionAPIService()

export async function GET(request: NextRequest) {
  try {
    // Verificar se a requisição tem o header de segurança do cron
    const authHeader = request.headers.get('x-cron-secret')
    const cronSecret = process.env.CRON_SECRET

    if (!authHeader || authHeader !== cronSecret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log('🔄 Iniciando processamento de envios em massa...')

    // Buscar campanhas ativas
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
    `) as any[]

    if (!campanhas || campanhas.length === 0) {
      console.log('ℹ️ Nenhuma campanha ativa para processar')
      return NextResponse.json({ 
        success: true, 
        message: "Nenhuma campanha ativa" 
      })
    }

    console.log(`📦 Encontradas ${campanhas.length} campanhas ativas`)

    for (const campanha of campanhas) {
      try {
        console.log(`\n🎯 Processando campanha: ${campanha.nome} (ID: ${campanha.id})`)

        // Verificar status da instância
        if (!['conectada', 'connected'].includes(campanha.instancia_status)) {
          console.log(`⚠️ Instância ${campanha.instance_name} não está conectada. Status: ${campanha.instancia_status}`)
          await executeQuery(`
            UPDATE campanhas_envio_massa 
            SET status = 'pausada'
            WHERE id = ?
          `, [campanha.id])
          continue
        }

        // Buscar envios pendentes
        const envios = await executeQuery(`
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
        `, [campanha.id]) as any[]

        if (!envios || envios.length === 0) {
          console.log(`✅ Campanha ${campanha.id} concluída - todos os envios processados`)
          await executeQuery(`
            UPDATE campanhas_envio_massa 
            SET 
              status = 'concluida',
              data_conclusao = NOW()
            WHERE id = ?
          `, [campanha.id])
          continue
        }

        console.log(`📱 Processando ${envios.length} envios pendentes`)

        for (const envio of envios) {
          try {
            // Personalizar mensagem
            const mensagem = personalizarMensagem(
              campanha.template_conteudo,
              {
                nome: envio.cliente_nome,
                telefone: envio.cliente_telefone,
                vencimento: envio.data_vencimento,
                plano: envio.plano_nome
              }
            )

            console.log(`📤 Enviando mensagem para ${envio.cliente_nome} (${envio.cliente_telefone})`)

            // Enviar mensagem
            const resultado = await evolutionAPI.sendTextMessage(
              campanha.instance_name,
              envio.cliente_telefone,
              mensagem
            )

            // Atualizar status do envio
            await executeQuery(`
              UPDATE envios_massa_detalhes 
              SET 
                status = 'enviado',
                mensagem_enviada = ?,
                data_envio = NOW()
              WHERE id = ?
            `, [mensagem, envio.id])

            // Atualizar contadores da campanha
            await executeQuery(`
              UPDATE campanhas_envio_massa 
              SET 
                enviados = enviados + 1,
                sucessos = sucessos + 1
              WHERE id = ?
            `, [campanha.id])

            console.log(`✅ Mensagem enviada com sucesso para ${envio.cliente_telefone}`)

            // Aguardar intervalo configurado
            if (campanha.intervalo_segundos > 0) {
              console.log(`⏳ Aguardando ${campanha.intervalo_segundos} segundos antes do próximo envio`)
              await new Promise(resolve => setTimeout(resolve, campanha.intervalo_segundos * 1000))
            }

          } catch (error) {
            console.error(`❌ Erro ao processar envio ${envio.id}:`, error)

            // Marcar envio como erro
            await executeQuery(`
              UPDATE envios_massa_detalhes 
              SET 
                status = 'erro',
                erro_detalhes = ?,
                tentativas = tentativas + 1
              WHERE id = ?
            `, [String(error), envio.id])

            // Atualizar contadores da campanha
            await executeQuery(`
              UPDATE campanhas_envio_massa 
              SET 
                enviados = enviados + 1,
                falhas = falhas + 1
              WHERE id = ?
            `, [campanha.id])
          }
        }

      } catch (error) {
        console.error(`❌ Erro ao processar campanha ${campanha.id}:`, error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Processamento concluído" 
    })

  } catch (error) {
    console.error('❌ Erro no processamento de envios:', error)
    return NextResponse.json(
      { error: "Erro interno no processamento" },
      { status: 500 }
    )
  }
}

function personalizarMensagem(template: string, dados: any): string {
  let mensagem = template

  // Substituir variáveis
  Object.entries(dados).forEach(([chave, valor]) => {
    mensagem = mensagem.replace(
      new RegExp(`{${chave}}`, 'g'), 
      String(valor || '')
    )
  })

  return mensagem
} 