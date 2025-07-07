import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"
import { processarEnvioMassa } from '@/lib/auto-envio-massa'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const campanhaId = parseInt(await params.id)
    if (isNaN(campanhaId)) {
      return NextResponse.json({ 
        error: "ID da campanha inválido" 
      }, { status: 400 })
    }

    // Verificar se campanha existe
    const campanha = await executeQuery(`
      SELECT 
        c.*,
        ei.status as instancia_status
      FROM campanhas_envio_massa c
      LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
      WHERE c.id = ?
    `, [campanhaId]) as any[]

    if (!campanha.length) {
      return NextResponse.json({ 
        error: "Campanha não encontrada" 
      }, { status: 404 })
    }

    // Verificar se instância está conectada
    if (!['conectada', 'connected'].includes(campanha[0].instancia_status)) {
      return NextResponse.json({ 
        error: "Instância não está conectada" 
      }, { status: 400 })
    }

    // Verificar se campanha pode ser iniciada
    if (!['rascunho', 'agendada'].includes(campanha[0].status)) {
      return NextResponse.json({ 
        error: "Campanha não pode ser iniciada - status atual: " + campanha[0].status 
      }, { status: 400 })
    }

    // Verificar se há clientes para envio
    const totalPendentes = await executeQuery(`
      SELECT COUNT(*) as total
      FROM envios_massa_detalhes
      WHERE campanha_id = ? AND status = 'pendente'
    `, [campanhaId]) as any[]

    if (!totalPendentes[0].total) {
      return NextResponse.json({ 
        error: "Não há mensagens pendentes para envio" 
      }, { status: 400 })
    }

    // Atualizar status da campanha para enviando
    await executeQuery(`
      UPDATE campanhas_envio_massa 
      SET 
        status = 'enviando',
        data_inicio = NOW(),
        enviados = 0,
        sucessos = 0,
        falhas = 0
      WHERE id = ?
    `, [campanhaId])

    // Resetar status dos envios para garantir processamento correto
    await executeQuery(`
      UPDATE envios_massa_detalhes
      SET 
        status = 'pendente',
        tentativas = 0,
        data_envio = NULL,
        message_id = NULL,
        erro_mensagem = NULL
      WHERE campanha_id = ? AND status != 'enviado'
    `, [campanhaId])

    console.log(`Iniciando processamento da campanha ${campanhaId} com ${totalPendentes[0].total} envios pendentes`)

    // Iniciar processamento em background
    processarEnvioMassa(campanhaId).catch(error => {
      console.error(`Erro no processamento da campanha ${campanhaId}:`, error)
    })

    return NextResponse.json({ 
      success: true, 
      message: "Campanha iniciada com sucesso",
      total_clientes: totalPendentes[0].total
    })

  } catch (error: any) {
    console.error("Erro ao iniciar campanha:", error)
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 