import { NextRequest, NextResponse } from 'next/server'
import { getAllConfiguracoes, updateConfiguracao, initConfiguracoes, getAdminSupremo } from '@/lib/configuracoes'

// GET - Buscar todas as configurações (otimizado para rapidez)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const includeAdmin = url.searchParams.get('admin') === 'true'
    
    // Inicializar configurações se necessário (só na primeira vez)
    await initConfiguracoes()
    
    const configuracoes = await getAllConfiguracoes()
    
    // Só buscar admin se explicitamente solicitado (para página de configurações)
    if (includeAdmin) {
      const adminSupremo = await getAdminSupremo()
    if (adminSupremo) {
      configuracoes.push({
        id: 0,
        chave: 'admin_nome',
        valor: adminSupremo.nome,
        descricao: 'Nome do administrador supremo',
        created_at: '',
        updated_at: ''
      })
    }
    }
    
    // Cache por 60 segundos
    return NextResponse.json(configuracoes, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configurações
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { configuracoes } = body

    if (!configuracoes || !Array.isArray(configuracoes)) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Atualizar cada configuração
    const results = []
    for (const config of configuracoes) {
      const { chave, valor } = config
      if (chave && valor !== undefined) {
        let success = false
        
        // Tratamento especial para dados do admin supremo
        if (chave === 'admin_password') {
          const { updateAdminPassword } = await import('@/lib/configuracoes')
          success = await updateAdminPassword(valor)
        } else if (chave === 'admin_nome') {
          // Para nome do admin, precisamos atualizar na tabela usuarios
          const { updateAdminSupremo } = await import('@/lib/configuracoes')
          success = await updateAdminSupremo(valor)
        } else {
          success = await updateConfiguracao(chave, valor)
        }
        
        results.push({ chave, success })
      }
    }

    return NextResponse.json({ 
      message: 'Configurações atualizadas',
      results 
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 