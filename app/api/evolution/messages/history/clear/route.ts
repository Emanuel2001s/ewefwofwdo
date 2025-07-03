import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { executeQuery } from '@/lib/db'

export async function DELETE(request: NextRequest) {
  try {
    // Verificar permissões de administrador
    await verifyEvolutionPermissions()

    // Usar TRUNCATE para limpar a tabela de forma eficiente e resetar o auto-incremento
    const query = 'TRUNCATE TABLE message_history'
    
    // O cache para a consulta de histórico já foi desabilitado, mas é bom manter a flag para consistência
    await executeQuery(query, [], true) 

    // Invalidar o cache de consultas relacionadas, se necessário (boa prática)
    // Como o cache para SELECT foi desativado na query principal, esta etapa é mais um seguro.

    return NextResponse.json({
      success: true,
      message: 'Histórico de mensagens limpo com sucesso.'
    })

  } catch (error) {
    console.error('Erro ao limpar histórico de mensagens:', error)
    
    if (error instanceof Error && error.message.includes('Acesso negado')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor ao limpar o histórico.' },
      { status: 500 }
    )
  }
} 