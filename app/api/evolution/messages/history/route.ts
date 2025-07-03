import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { executeQuery } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verificar permissões
    await verifyEvolutionPermissions()

    const { searchParams } = new URL(request.url)
    
    // Se for solicitação de estatísticas
    if (searchParams.get('stats') === 'true') {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_mensagens,
          SUM(CASE WHEN status = 'enviada' THEN 1 ELSE 0 END) as enviadas,
          SUM(CASE WHEN status = 'erro' THEN 1 ELSE 0 END) as erro,
          SUM(CASE WHEN status = 'enviando' THEN 1 ELSE 0 END) as pendentes
        FROM message_history
        WHERE DATE(created_at) = CURDATE()
      `
      
      const statsResult = await executeQuery(statsQuery)
      const stats = Array.isArray(statsResult) && statsResult.length > 0 
        ? statsResult[0] as any
        : { total_mensagens: 0, enviadas: 0, erro: 0, pendentes: 0 }

      return NextResponse.json({
        success: true,
        stats: {
          total_mensagens: Number(stats.total_mensagens) || 0,
          enviadas: Number(stats.enviadas) || 0,
          erro: Number(stats.erro) || 0,
          pendentes: Number(stats.pendentes) || 0
        }
      })
    }
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Parâmetros de filtro
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const messageType = searchParams.get('message_type')
    const instancia = searchParams.get('instancia')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')

    // Construir query base
    let whereConditions = []
    let queryParams: any[] = []
    let paramIndex = 1

    // Filtro de busca
    if (search) {
      whereConditions.push(`(
        c.nome LIKE ? OR 
        mh.mensagem_enviada LIKE ? OR 
        mh.numero_whatsapp LIKE ?
      )`)
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
      paramIndex += 3
    }

    // Filtro de status
    if (status && status !== 'todos') {
      whereConditions.push(`mh.status = ?`)
      queryParams.push(status)
      paramIndex++
    }

    // Filtro de tipo de mensagem
    if (messageType && messageType !== 'todos') {
      whereConditions.push(`mh.message_type = ?`)
      queryParams.push(messageType)
      paramIndex++
    }

    // Filtro de instância
    if (instancia && instancia !== 'todas') {
      whereConditions.push(`ei.nome = ?`)
      queryParams.push(instancia)
      paramIndex++
    }

    // Filtro de data início
    if (dataInicio) {
      whereConditions.push(`DATE(mh.created_at) >= ?`)
      queryParams.push(dataInicio)
      paramIndex++
    }

    // Filtro de data fim
    if (dataFim) {
      whereConditions.push(`DATE(mh.created_at) <= ?`)
      queryParams.push(dataFim)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    // Query para buscar mensagens
    const mensagensQuery = `
      SELECT 
        mh.id,
        c.nome as cliente_nome,
        c.whatsapp as cliente_whatsapp,
        ei.nome as instancia_nome,
        mt.nome as template_nome,
        mh.numero_whatsapp,
        mh.message_type,
        mh.mensagem_enviada,
        mh.imagem_enviada,
        mh.status,
        mh.error_message,
        mh.created_at
      FROM message_history mh
      LEFT JOIN clientes c ON mh.cliente_id = c.id
      LEFT JOIN evolution_instancias ei ON mh.instancia_id = ei.id
      LEFT JOIN message_templates mt ON mh.template_id = mt.id
      ${whereClause}
      ORDER BY mh.created_at DESC
      LIMIT ? OFFSET ?
    `

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM message_history mh
      LEFT JOIN clientes c ON mh.cliente_id = c.id
      LEFT JOIN evolution_instancias ei ON mh.instancia_id = ei.id
      LEFT JOIN message_templates mt ON mh.template_id = mt.id
      ${whereClause}
    `

    // Executar queries
    const [mensagens, countResult] = await Promise.all([
      executeQuery(mensagensQuery, [...queryParams, limit, offset], true),
      executeQuery(countQuery, queryParams, true)
    ])

    const total = Array.isArray(countResult) && countResult.length > 0 
      ? (countResult[0] as any).total 
      : 0

    return NextResponse.json({
      success: true,
      mensagens: mensagens || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })

  } catch (error) {
    console.error('Erro ao buscar histórico de mensagens:', error)
    
    // Verificar se é erro de permissão
    if (error instanceof Error && error.message.includes('Acesso negado')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 