import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { executeQuery } from '@/lib/db'
import { RowDataPacket, OkPacket } from 'mysql2'
import { getTemplatesByTipo, previewTemplate } from '@/lib/whatsapp-templates'
import { EvolutionAPIService } from '@/lib/evolution-api'

/**
 * GET - Listar templates de mensagem
 */
export async function GET(request: NextRequest) {
  try {
    await verifyEvolutionPermissions()
    
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const message_type = searchParams.get('message_type')
    const ativo = searchParams.get('ativo')
    const search = searchParams.get('search')
    
    let query = 'SELECT * FROM message_templates WHERE 1=1'
    const params: any[] = []
    
    // Filtros opcionais
    if (tipo && tipo !== 'all') {
      query += ' AND tipo = ?'
      params.push(tipo)
    }
    
    if (message_type && message_type !== 'all') {
      query += ' AND message_type = ?'
      params.push(message_type)
    }
    
    if (ativo !== null && ativo !== undefined) {
      query += ' AND ativo = ?'
      params.push(ativo === 'true')
    }
    
    if (search) {
      query += ' AND (nome LIKE ? OR mensagem LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const templates = await executeQuery(query, params) as RowDataPacket[]
    
    // Gerar preview para cada template se solicitado
    const includePreview = searchParams.get('preview') === 'true'
    if (includePreview) {
      for (const template of templates) {
        try {
          const evolutionAPI = new EvolutionAPIService()
          template.preview = await evolutionAPI.processMessageTemplate(template.mensagem, {
            nome: 'João Silva',
            whatsapp: '(11) 99999-9999',
            usuario: 'joao123',
            status: 'ativo',
            plano: 'Premium',
            valor_plano: 'R$ 49,90',
            data_ativacao: '01/01/2024',
            data_vencimento: '01/02/2024',
            dias_vencimento: '5',
            dias_desde_ativacao: '30',
            servidor: 'Servidor 1',
            data_atual: new Date().toLocaleDateString('pt-BR'),
            hora_atual: new Date().toLocaleTimeString('pt-BR'),
            nome_sistema: 'Dashboard'
          })
        } catch (error) {
          template.preview = template.mensagem
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: templates,
      total: templates.length
    })
    
  } catch (error: any) {
    console.error('Erro ao listar templates:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
}

/**
 * POST - Criar novo template
 */
export async function POST(request: NextRequest) {
  try {
    await verifyEvolutionPermissions()
    
    const body = await request.json()

    // Se for uma requisição de preview
    if (body.action === 'preview') {
      const { templateId, clienteId, customMessage } = body

      let messageText = customMessage
      let clienteData: any = {}

      // Se usar template, buscar do banco
      if (templateId) {
        const templateResult = await executeQuery(
          'SELECT mensagem FROM message_templates WHERE id = ?',
          [templateId]
        ) as RowDataPacket[]

        if (templateResult.length === 0) {
          return NextResponse.json(
            { error: 'Template não encontrado' },
            { status: 404 }
          )
        }

        messageText = templateResult[0].mensagem
      }

      // Se tiver clienteId, buscar dados reais do cliente
      if (clienteId) {
        const clienteResult = await executeQuery(`
          SELECT 
            c.nome, c.whatsapp, c.usuario, c.status, c.data_vencimento, c.data_ativacao,
            p.nome as plano, p.valor as valor_plano,
            s.nome as servidor
          FROM clientes c
          LEFT JOIN planos p ON c.plano_id = p.id
          LEFT JOIN servidores s ON c.servidor_id = s.id
          WHERE c.id = ?
        `, [clienteId]) as RowDataPacket[]

        if (clienteResult.length > 0) {
          const cliente = clienteResult[0]
          const dataVencimento = new Date(cliente.data_vencimento)
          const dataAtivacao = new Date(cliente.data_ativacao)
          const hoje = new Date()
          
          const diasVencimento = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
          const diasDesdeAtivacao = Math.ceil((hoje.getTime() - dataAtivacao.getTime()) / (1000 * 60 * 60 * 24))

          clienteData = {
            nome: cliente.nome || 'Cliente',
            whatsapp: cliente.whatsapp || '(00) 00000-0000',
            usuario: cliente.usuario || 'usuario',
            status: cliente.status || 'ativo',
            plano: cliente.plano || 'Plano Básico',
            valor_plano: cliente.valor_plano ? `R$ ${parseFloat(cliente.valor_plano).toFixed(2).replace('.', ',')}` : 'R$ 0,00',
            data_ativacao: dataAtivacao.toLocaleDateString('pt-BR'),
            data_vencimento: dataVencimento.toLocaleDateString('pt-BR'),
            dias_vencimento: diasVencimento.toString(),
            dias_desde_ativacao: diasDesdeAtivacao.toString(),
            servidor: cliente.servidor || 'Servidor Padrão',
            data_atual: hoje.toLocaleDateString('pt-BR'),
            hora_atual: hoje.toLocaleTimeString('pt-BR'),
            nome_sistema: 'Dashboard'
          }
        }
      }

      // Usar dados simulados se não tiver dados reais
      if (Object.keys(clienteData).length === 0) {
        clienteData = {
          nome: 'João Silva',
          whatsapp: '(11) 99999-9999',
          usuario: 'joao123',
          status: 'ativo',
          plano: 'Premium',
          valor_plano: 'R$ 49,90',
          data_ativacao: '01/01/2024',
          data_vencimento: '01/02/2024',
          dias_vencimento: '5',
          dias_desde_ativacao: '30',
          servidor: 'Servidor 1',
          data_atual: new Date().toLocaleDateString('pt-BR'),
          hora_atual: new Date().toLocaleTimeString('pt-BR'),
          nome_sistema: 'Dashboard'
        }
      }

      const evolutionAPI = new EvolutionAPIService()
      const preview = await evolutionAPI.processMessageTemplate(messageText, clienteData)
      
      return NextResponse.json({
        success: true,
        preview
      })
    }

    // Criar novo template (código existente)
    const { nome, tipo, message_type, assunto, mensagem, imagem_url, imagem_caption, ativo } = body
    
    // Validar dados obrigatórios
    if (!nome || !tipo || !message_type || !mensagem) {
      return NextResponse.json(
        { error: 'Nome, tipo, tipo de mensagem e mensagem são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Validar tipos permitidos
    const tiposPermitidos = ['vencimento', 'pagamento', 'boas_vindas', 'manutencao', 'personalizada']
    if (!tiposPermitidos.includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de template inválido' },
        { status: 400 }
      )
    }
    
    const messageTypesPermitidos = ['texto', 'imagem']
    if (!messageTypesPermitidos.includes(message_type)) {
      return NextResponse.json(
        { error: 'Tipo de mensagem inválido' },
        { status: 400 }
      )
    }
    
    // Se for imagem, validar URL da imagem
    if (message_type === 'imagem' && !imagem_url) {
      return NextResponse.json(
        { error: 'URL da imagem é obrigatória para templates de imagem' },
        { status: 400 }
      )
    }
    
    // Verificar se já existe template com o mesmo nome
    const existingTemplate = await executeQuery(
      'SELECT id FROM message_templates WHERE nome = ?',
      [nome]
    ) as RowDataPacket[]
    
    if (existingTemplate.length > 0) {
      return NextResponse.json(
        { error: 'Já existe um template com este nome' },
        { status: 400 }
      )
    }
    
    // Inserir template no banco
    const insertResult = await executeQuery(`
      INSERT INTO message_templates (
        nome,
        tipo,
        message_type,
        assunto,
        mensagem,
        imagem_url,
        imagem_caption,
        ativo,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      nome,
      tipo,
      message_type,
      assunto || null,
      mensagem,
      imagem_url || null,
      imagem_caption || null,
      ativo
    ]) as OkPacket
    
    // Buscar template criado
    const createdTemplate = await executeQuery(
      'SELECT * FROM message_templates WHERE id = ?',
      [insertResult.insertId]
    ) as RowDataPacket[]
    
    const template = createdTemplate[0]
    
    return NextResponse.json({
      message: 'Template criado com sucesso',
      template: {
        ...template,
        preview: await previewTemplate(template)
      }
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Erro ao criar template:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
} 