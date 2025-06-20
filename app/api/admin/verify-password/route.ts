import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { executeQuery } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export async function POST(request: NextRequest) {
  try {
    const { currentPassword } = await request.json()

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Senha atual é obrigatória' },
        { status: 400 }
      )
    }

    // Buscar a senha atual do admin supremo
    const result = await executeQuery(
      'SELECT senha FROM usuarios WHERE id = 1 AND tipo = ?',
      ['admin']
    ) as RowDataPacket[]

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Admin não encontrado' },
        { status: 404 }
      )
    }

    const admin = result[0]
    const isValidPassword = await bcrypt.compare(currentPassword, admin.senha)

    return NextResponse.json({ valid: isValidPassword })
  } catch (error) {
    console.error('Erro ao verificar senha:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 