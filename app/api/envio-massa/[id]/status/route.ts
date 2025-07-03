import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const campanhaId = parseInt(params.id)
    
    if (!campanhaId || isNaN(campanhaId)) {
      return NextResponse.json({ 
        error: "ID da campanha inválido" 
      }, { status: 400 })
    }

    // Buscar dados da campanha
    const campanha = await executeQuery(`
      SELECT 
        c.id,
        c.nome,
        c.status,
        c.total_clientes,
        c.enviados,
        c.sucessos,
        c.falhas,
        c.data_criacao,
        c.data_inicio,
        c.data_conclusao,
        c.intervalo_segundos,
        mt.nome as template_nome,
        ei.nome as instancia_nome,
        ei.status as instancia_status
      FROM campanhas_envio_massa c
      LEFT JOIN message_templates mt ON c.template_id = mt.id
      LEFT JOIN evolution_instancias ei ON c.instancia_id = ei.id
      WHERE c.id = ?
    `, [campanhaId]) as any[]

    if (!campanha || campanha.length === 0) {
      return NextResponse.json({ 
        error: "Campanha não encontrada" 
      }, { status: 404 })
    }

    const campanhaData = campanha[0]

    // Buscar estatísticas detalhadas dos envios
    const estatisticas = await executeQuery(`
      SELECT 
        status,
        COUNT(*) as quantidade
      FROM envios_massa_detalhes
      WHERE campanha_id = ?
      GROUP BY status
    `, [campanhaId]) as any[]

    // Organizar estatísticas
    const stats = {
      pendente: 0,
      enviado: 0,
      entregue: 0,
      lido: 0,
      erro: 0
    }

    estatisticas.forEach(stat => {
      if (stats.hasOwnProperty(stat.status)) {
        stats[stat.status as keyof typeof stats] = stat.quantidade
      }
    })

    // Calcular progresso
    const totalProcessados = stats.enviado + stats.entregue + stats.lido + stats.erro
    const progresso = campanhaData.total_clientes > 0 
      ? Math.round((totalProcessados / campanhaData.total_clientes) * 100)
      : 0

    // Calcular taxa de sucesso
    const taxaSucesso = totalProcessados > 0
      ? Math.round(((stats.enviado + stats.entregue + stats.lido) / totalProcessados) * 100)
      : 0

    // Estimar tempo restante (se estiver enviando)
    let tempoEstimado = null
    if (campanhaData.status === 'enviando' && campanhaData.data_inicio) {
      const tempoDecorrido = new Date().getTime() - new Date(campanhaData.data_inicio).getTime()
      const tempoDecorridoMinutos = Math.floor(tempoDecorrido / (1000 * 60))
      
      if (totalProcessados > 0) {
        const tempoMedioPorEnvio = tempoDecorrido / totalProcessados
        const enviosRestantes = campanhaData.total_clientes - totalProcessados
        const tempoRestanteMs = enviosRestantes * tempoMedioPorEnvio
        tempoEstimado = Math.ceil(tempoRestanteMs / (1000 * 60)) // em minutos
      }
    }

    // Buscar últimos envios (para debug/monitoramento)
    const ultimosEnvios = await executeQuery(`
      SELECT 
        emd.id,
        emd.status,
        emd.data_envio,
        emd.erro_detalhes,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone
      FROM envios_massa_detalhes emd
      LEFT JOIN clientes c ON emd.cliente_id = c.id
      WHERE emd.campanha_id = ?
      ORDER BY emd.data_envio DESC
      LIMIT 10
    `, [campanhaId]) as any[]

    return NextResponse.json({
      success: true,
      campanha: {
        ...campanhaData,
        progresso,
        taxa_sucesso: taxaSucesso,
        tempo_estimado_minutos: tempoEstimado,
        estatisticas: stats,
        ultimos_envios: ultimosEnvios
      }
    })

  } catch (error) {
    console.error("Erro ao buscar status da campanha:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST - Pausar/Retomar campanha
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const campanhaId = parseInt(params.id)
    const { acao } = await request.json()
    
    if (!campanhaId || isNaN(campanhaId)) {
      return NextResponse.json({ 
        error: "ID da campanha inválido" 
      }, { status: 400 })
    }

    if (!['pausar', 'retomar', 'cancelar'].includes(acao)) {
      return NextResponse.json({ 
        error: "Ação inválida. Use: pausar, retomar ou cancelar" 
      }, { status: 400 })
    }

    // Verificar se a campanha existe
    const campanha = await executeQuery(`
      SELECT id, status FROM campanhas_envio_massa WHERE id = ?
    `, [campanhaId]) as any[]

    if (!campanha || campanha.length === 0) {
      return NextResponse.json({ 
        error: "Campanha não encontrada" 
      }, { status: 404 })
    }

    const statusAtual = campanha[0].status

    // Validar transições de status
    let novoStatus = statusAtual
    
    switch (acao) {
      case 'pausar':
        if (statusAtual === 'enviando') {
          novoStatus = 'pausada'
        } else {
          return NextResponse.json({ 
            error: "Só é possível pausar campanhas que estão enviando" 
          }, { status: 400 })
        }
        break
        
      case 'retomar':
        if (statusAtual === 'pausada') {
          novoStatus = 'enviando'
        } else {
          return NextResponse.json({ 
            error: "Só é possível retomar campanhas pausadas" 
          }, { status: 400 })
        }
        break
        
      case 'cancelar':
        if (['enviando', 'pausada', 'agendada'].includes(statusAtual)) {
          novoStatus = 'cancelada'
        } else {
          return NextResponse.json({ 
            error: "Não é possível cancelar esta campanha no status atual" 
          }, { status: 400 })
        }
        break
    }

    // Atualizar status
    await executeQuery(`
      UPDATE campanhas_envio_massa 
      SET 
        status = ?,
        data_conclusao = ${acao === 'cancelar' ? 'NOW()' : 'data_conclusao'}
      WHERE id = ?
    `, [novoStatus, campanhaId])

    return NextResponse.json({
      success: true,
      message: `Campanha ${acao === 'pausar' ? 'pausada' : acao === 'retomar' ? 'retomada' : 'cancelada'} com sucesso`,
      novo_status: novoStatus
    })

  } catch (error) {
    console.error("Erro ao alterar status da campanha:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 