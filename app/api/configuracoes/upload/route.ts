import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
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

    // Criar diretório se não existir
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // Diretório já existe
    }

    // Gerar nome do arquivo
    const fileExtension = file.name.split('.').pop()
    const fileName = tipo === 'favicon' 
      ? `favicon.${fileExtension}` 
      : `logo.${fileExtension}`
    
    const filePath = join(uploadDir, fileName)
    const publicPath = `/uploads/${fileName}`

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Atualizar configuração no banco
    const configKey = tipo === 'favicon' ? 'favicon_url' : 'logo_url'
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