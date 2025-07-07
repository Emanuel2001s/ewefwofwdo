import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"
import { EvolutionAPIService } from "@/lib/evolution-api"

const evolutionAPI = new EvolutionAPIService()

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { campanhaId } = await request.json()

    if (!campanhaId) {
      return NextResponse.json({ error: "ID da campanha é obrigatório" }, { status: 400 })
    }

    // Buscar dados da campanha
    const campanha = await executeQuery(`
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
      WHERE c.id = ? AND c.status = 'enviando'
    `, [campanhaId]) as any[]

    if (!campanha.length) {
      return NextResponse.json({ error: "Campanha não encontrada ou não está em processamento" }, { status: 404 })
    }

    const campanhaData = campanha[0]

    // Verificar se a instância está conectada
    if (!['conectada', 'connected'].includes(campanhaData.instancia_status)) {
      await executeQuery(`
        UPDATE campanhas_envio_massa 
        SET status = 'pausada'
        WHERE id = ?
      `, [campanhaId])
      
      return NextResponse.json({ error: "Instância não está conectada" }, { status: 400 })
    }

    // Buscar próximos envios pendentes (lote de 10)
    const enviosPendentes = await executeQuery(`
      SELECT 
        emd.id,
        emd.cliente_id,
        emd.whatsapp as cliente_telefone,
        c.nome as cliente_nome,
        c.data_vencimento,
        p.nome as plano_nome
      FROM envios_massa_detalhes emd
      LEFT JOIN clientes c ON emd.cliente_id = c.id
      LEFT JOIN planos p ON c.plano_id = p.id
      WHERE emd.campanha_id = ? AND emd.status = 'pendente'
      ORDER BY emd.id ASC
      LIMIT 10
    `, [campanhaId]) as any[]

    if (!enviosPendentes || enviosPendentes.length === 0) {
      // Campanha concluída
      await executeQuery(`
        UPDATE campanhas_envio_massa 
        SET 
          status = 'concluida',
          data_conclusao = NOW()
        WHERE id = ?
      `, [campanhaId])
      
      return NextResponse.json({ 
        success: true, 
        message: "Campanha concluída - todos os envios processados",
        processados: 0
      })
    }

    let sucessos = 0
    let falhas = 0

    // Processar cada envio
    for (const envio of enviosPendentes) {
      try {
        if (!envio.cliente_telefone) {
          throw new Error(`Cliente ${envio.cliente_nome} não possui número de WhatsApp`)
        }

        // Personalizar mensagem com dados do cliente
        const mensagemPersonalizada = personalizarMensagem(
          campanhaData.template_conteudo,
          {
            nome: envio.cliente_nome,
            telefone: envio.cliente_telefone,
            vencimento: envio.data_vencimento,
            plano: envio.plano_nome
          }
        )

        console.log(`📤 Enviando mensagem para ${envio.cliente_nome} (${envio.cliente_telefone})`)

        // Enviar mensagem via Evolution API
        const resultado = await evolutionAPI.sendTextMessage(
          campanhaData.instance_name,
          envio.cliente_telefone,
          mensagemPersonalizada
        )

        if (resultado) {
          // Marcar como enviado
          await executeQuery(`
            UPDATE envios_massa_detalhes 
            SET 
              status = 'enviado',
              mensagem_enviada = ?,
              enviado_em = NOW()
            WHERE id = ?
          `, [mensagemPersonalizada, envio.id])

          sucessos++
          console.log(`✅ Mensagem enviada com sucesso para ${envio.cliente_telefone}`)
        } else {
          throw new Error("Falha no envio via Evolution API")
        }

        // Aguardar intervalo configurado
        if (campanhaData.intervalo_segundos > 0) {
          await new Promise(resolve => setTimeout(resolve, campanhaData.intervalo_segundos * 1000))
        }

      } catch (error) {
        console.error(`❌ Erro ao processar envio ${envio.id}:`, error)
        
        // Marcar como erro
        await executeQuery(`
          UPDATE envios_massa_detalhes 
          SET 
            status = 'erro',
            erro_mensagem = ?,
            tentativas = tentativas + 1
          WHERE id = ?
        `, [String(error), envio.id])

        falhas++
      }
    }

    // Atualizar contadores da campanha
    await executeQuery(`
      UPDATE campanhas_envio_massa 
      SET 
        enviados = enviados + ?,
        sucessos = sucessos + ?,
        falhas = falhas + ?
      WHERE id = ?
    `, [sucessos + falhas, sucessos, falhas, campanhaId])

    return NextResponse.json({
      success: true,
      message: `Lote processado: ${sucessos} sucessos, ${falhas} falhas`,
      processados: sucessos + falhas,
      sucessos,
      falhas
    })

  } catch (error: any) {
    console.error("Erro no processamento imediato:", error)
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

function personalizarMensagem(template: string, dados: any): string {
  let mensagem = template

  // Substituir variáveis
  Object.entries(dados).forEach(([chave, valor]) => {
    mensagem = mensagem.replace(
      new RegExp(`\\{${chave}\\}`, 'g'), 
      String(valor || '')
    )
  })

  return mensagem
} 