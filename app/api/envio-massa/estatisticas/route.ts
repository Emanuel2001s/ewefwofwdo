import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Executar consultas para estatísticas
    const [
      totalCampanhas,
      campanhasAtivas,
      mensagensHoje,
      taxaSucesso
    ] = await Promise.all([
      // Total de campanhas
      executeQuery("SELECT COUNT(*) as total_campanhas FROM campanhas_envio_massa") as Promise<any[]>,
      
      // Campanhas ativas (agendadas ou enviando)
      executeQuery("SELECT COUNT(*) as campanhas_ativas FROM campanhas_envio_massa WHERE status IN ('agendada', 'enviando')") as Promise<any[]>,
      
      // Mensagens enviadas hoje
      executeQuery(`SELECT COALESCE(SUM(enviados), 0) as mensagens_hoje 
       FROM campanhas_envio_massa 
       WHERE DATE(data_inicio) = CURDATE()`) as Promise<any[]>,
      
      // Taxa de sucesso média
      executeQuery(`SELECT 
         CASE 
           WHEN SUM(enviados) > 0 
           THEN ROUND((SUM(sucessos) / SUM(enviados)) * 100, 1)
           ELSE 0 
         END as taxa_sucesso_media
       FROM campanhas_envio_massa 
       WHERE status = 'concluida'`) as Promise<any[]>
    ])

    // Compilar estatísticas
    const estatisticas = {
      total_campanhas: totalCampanhas[0]?.total_campanhas || 0,
      campanhas_ativas: campanhasAtivas[0]?.campanhas_ativas || 0,
      mensagens_enviadas_hoje: mensagensHoje[0]?.mensagens_hoje || 0,
      taxa_sucesso_media: taxaSucesso[0]?.taxa_sucesso_media || 0
    }

    return NextResponse.json(estatisticas)

  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 