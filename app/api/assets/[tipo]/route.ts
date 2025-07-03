import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface AssetRow extends RowDataPacket {
  data: Buffer | null
  type: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
) {
  const { tipo } = await params

  // Validar tipo
  if (!tipo || !['favicon', 'logo'].includes(tipo)) {
    return new NextResponse('Tipo de asset inválido', { status: 400 })
  }

  try {
    // Buscar dados do arquivo no banco
    const columnData = tipo === 'favicon' ? 'favicon_data' : 'logo_data'
    const columnType = tipo === 'favicon' ? 'favicon_type' : 'logo_type'
    
    const query = `
      SELECT ${columnData} as data, ${columnType} as type 
      FROM configuracoes 
      WHERE chave = ? AND ${columnData} IS NOT NULL
      LIMIT 1
    `
    
    const rows = await executeQuery(query, [
      tipo === 'favicon' ? 'favicon_url' : 'logo_url'
    ]) as AssetRow[]

    if (!rows.length || !rows[0].data) {
      // Retornar imagem padrão se não encontrar
      const defaultPath = tipo === 'favicon' 
        ? '/favicon.ico' 
        : '/placeholder-logo.png'
      
      return NextResponse.redirect(new URL(defaultPath, request.url))
    }

    const { data, type } = rows[0]

    // Configurar headers apropriados
    const headers = new Headers()
    headers.set('Content-Type', type || 'image/png')
    headers.set('Cache-Control', 'public, max-age=3600') // Cache de 1 hora
    headers.set('Content-Length', data.length.toString())

    return new NextResponse(data, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error(`Erro ao carregar ${tipo}:`, error)
    
    // Fallback para arquivo padrão
    const defaultPath = tipo === 'favicon' 
      ? '/favicon.ico' 
      : '/placeholder-logo.png'
    
    return NextResponse.redirect(new URL(defaultPath, request.url))
  }
} 