import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { executeQuery } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth("admin")
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar templates disponíveis
    const templates = await executeQuery(`
      SELECT 
        id,
        nome,
        mensagem as conteudo,
        tipo as categoria,
        message_type,
        assunto,
        imagem_url,
        imagem_caption,
        ativo,
        created_at,
        updated_at
      FROM message_templates
      WHERE ativo = 1
      ORDER BY tipo ASC, nome ASC
    `) as any[]

    // Formatar dados dos templates
    const templatesFormatados = (templates || []).map((template: any) => ({
      id: template.id,
      nome: template.nome,
      conteudo: template.conteudo,
      categoria: template.categoria || 'Geral',
      message_type: template.message_type,
      assunto: template.assunto,
      imagem_url: template.imagem_url,
      imagem_caption: template.imagem_caption,
      variaveis: extractVariables(template.conteudo),
      preview: generatePreview(template.conteudo),
      created_at: template.created_at,
      updated_at: template.updated_at
    }))

    // Agrupar templates por categoria
    const templatesPorCategoria = templatesFormatados.reduce((acc: any, template: any) => {
      const categoria = template.categoria
      if (!acc[categoria]) {
        acc[categoria] = []
      }
      acc[categoria].push(template)
      return acc
    }, {})

    return NextResponse.json({
      templates: templatesFormatados,
      categorias: templatesPorCategoria,
      success: true
    })

  } catch (error) {
    console.error("Erro ao buscar templates:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

function extractVariables(conteudo: string): string[] {
  const regex = /\{([^}]+)\}/g
  const variaveis: string[] = []
  let match

  while ((match = regex.exec(conteudo)) !== null) {
    const variavel = `{${match[1]}}`
    if (!variaveis.includes(variavel)) {
      variaveis.push(variavel)
    }
  }

  return variaveis
}

function generatePreview(conteudo: string): string {
  let preview = conteudo
  
  // Substituir variáveis por valores de exemplo
  const exemplos = {
    '{nome}': 'João Silva',
    '{cliente}': 'João Silva', 
    '{data_vencimento}': '15/01/2025',
    '{plano}': 'Premium',
    '{valor_plano}': 'R$ 59,90',
    '{servidor}': 'Servidor BR-01',
    '{data_atual}': new Date().toLocaleDateString('pt-BR'),
    '{hora_atual}': new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    '{nome_sistema}': 'Dashboard IPTV',
    '{usuario}': 'joao.silva',
    '{dias_vencimento}': '3',
    '{data_ativacao}': new Date().toLocaleDateString('pt-BR')
  }

  Object.entries(exemplos).forEach(([variavel, valor]) => {
    preview = preview.replace(new RegExp(variavel.replace(/[{}]/g, '\\$&'), 'g'), valor)
  })

  return preview
}