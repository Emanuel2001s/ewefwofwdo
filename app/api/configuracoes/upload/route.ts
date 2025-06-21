import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { updateConfiguracao } from '@/lib/configuracoes'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tipo = formData.get('tipo') as string // 'favicon' ou 'logo'

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    if (!tipo || !['favicon', 'logo'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = {
      favicon: ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png'],
      logo: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
    }

    if (!allowedTypes[tipo as keyof typeof allowedTypes].includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido' },
        { status: 400 }
      )
    }

    // Gerar nome do arquivo
    const fileExtension = file.name.split('.').pop()
    const fileName = tipo === 'favicon' 
      ? `favicon.${fileExtension}` 
      : `logo.${fileExtension}`

    // Converter arquivo para buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Salvar arquivo como BLOB no banco de dados
    const columnData = tipo === 'favicon' ? 'favicon_data' : 'logo_data'
    const columnType = tipo === 'favicon' ? 'favicon_type' : 'logo_type'
    
    // Primeiro, verificar se já existe uma linha para esta configuração
    const configKey = tipo === 'favicon' ? 'favicon_url' : 'logo_url'
    const existingRows = await executeQuery(
      'SELECT id FROM configuracoes WHERE chave = ? LIMIT 1',
      [configKey]
    ) as any[]

    if (existingRows.length > 0) {
      // Atualizar linha existente
      await executeQuery(
        `UPDATE configuracoes SET ${columnData} = ?, ${columnType} = ? WHERE chave = ?`,
        [buffer, file.type, configKey]
      )
    } else {
      // Criar nova linha
      await executeQuery(
        `INSERT INTO configuracoes (chave, valor, ${columnData}, ${columnType}, descricao) VALUES (?, ?, ?, ?, ?)`,
        [
          configKey,
          `/api/assets/${tipo}`, // URL da API que serve o arquivo
          buffer,
          file.type,
          `${tipo === 'favicon' ? 'Favicon' : 'Logo'} do sistema`
        ]
      )
    }

    const publicPath = `/api/assets/${tipo}`

    // Atualizar configuração no banco (valor da URL)
    const success = await updateConfiguracao(configKey, publicPath)

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao salvar configuração no banco' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `${tipo === 'favicon' ? 'Favicon' : 'Logo'} atualizado com sucesso`,
      url: publicPath
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 