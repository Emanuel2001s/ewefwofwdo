import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { executeQuery } from '@/lib/db'
import { RowDataPacket, OkPacket } from 'mysql2'
import { previewTemplate } from '@/lib/whatsapp-templates'

/**
 * GET - Buscar template específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyEvolutionPermissions()
    
    const templateId = parseInt(params.id)
    
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'ID do template inválido' },
        { status: 400 }
      )
    }
    
    const templates = await executeQuery(
      'SELECT * FROM message_templates WHERE id = ?',
      [templateId]
    ) as RowDataPacket[]
    
    if (templates.length === 0) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }
    
    const template = templates[0]
    
    return NextResponse.json({
      template: {
        ...template,
        preview: await previewTemplate(template)
      }
    })
    
  } catch (error: any) {
    console.error('Erro ao buscar template:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
}

/**
 * PUT - Atualizar template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyEvolutionPermissions()
    
    const templateId = parseInt(params.id)
    
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'ID do template inválido' },
        { status: 400 }
      )
    }
    
    // Verificar se template existe
    const existingTemplates = await executeQuery(
      'SELECT * FROM message_templates WHERE id = ?',
      [templateId]
    ) as RowDataPacket[]
    
    if (existingTemplates.length === 0) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }
    
    const body = await request.json()
    const {
      nome,
      tipo,
      message_type,
      assunto,
      mensagem,
      imagem_url,
      imagem_caption,
      ativo = true
    } = body
    
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
    
    // Verificar se já existe outro template com o mesmo nome
    const duplicateTemplate = await executeQuery(
      'SELECT id FROM message_templates WHERE nome = ? AND id != ?',
      [nome, templateId]
    ) as RowDataPacket[]
    
    if (duplicateTemplate.length > 0) {
      return NextResponse.json(
        { error: 'Já existe um template com este nome' },
        { status: 400 }
      )
    }
    
    // Atualizar template no banco
    await executeQuery(`
      UPDATE message_templates SET
        nome = ?,
        tipo = ?,
        message_type = ?,
        assunto = ?,
        mensagem = ?,
        imagem_url = ?,
        imagem_caption = ?,
        ativo = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      nome,
      tipo,
      message_type,
      assunto || null,
      mensagem,
      imagem_url || null,
      imagem_caption || null,
      ativo,
      templateId
    ])
    
    // Buscar template atualizado
    const updatedTemplates = await executeQuery(
      'SELECT * FROM message_templates WHERE id = ?',
      [templateId]
    ) as RowDataPacket[]
    
    const template = updatedTemplates[0]
    
    return NextResponse.json({
      message: 'Template atualizado com sucesso',
      template: {
        ...template,
        preview: await previewTemplate(template)
      }
    })
    
  } catch (error: any) {
    console.error('Erro ao atualizar template:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
}

/**
 * DELETE - Excluir template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyEvolutionPermissions()
    
    const templateId = parseInt(params.id)
    
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'ID do template inválido' },
        { status: 400 }
      )
    }
    
    // Verificar se template existe
    const existingTemplates = await executeQuery(
      'SELECT * FROM message_templates WHERE id = ?',
      [templateId]
    ) as RowDataPacket[]
    
    if (existingTemplates.length === 0) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }
    
    const template = existingTemplates[0]
    
    // Verificar se o template está sendo usado no histórico de mensagens
    const messagesUsingTemplate = await executeQuery(
      'SELECT COUNT(*) as count FROM message_history WHERE template_id = ?',
      [templateId]
    ) as RowDataPacket[]
    
    const messageCount = messagesUsingTemplate[0].count
    
    if (messageCount > 0) {
      return NextResponse.json({
        error: `Este template não pode ser excluído pois foi usado em ${messageCount} mensagem(s). Você pode desativá-lo em vez de excluí-lo.`,
        canDeactivate: true,
        messageCount
      }, { status: 400 })
    }
    
    // Excluir template
    await executeQuery(
      'DELETE FROM message_templates WHERE id = ?',
      [templateId]
    )
    
    return NextResponse.json({
      message: `Template "${template.nome}" excluído com sucesso`
    })
    
  } catch (error: any) {
    console.error('Erro ao excluir template:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.message?.includes('Acesso negado') ? 403 : 500 }
    )
  }
} 