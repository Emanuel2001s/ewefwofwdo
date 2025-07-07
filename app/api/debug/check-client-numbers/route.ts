import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { RowDataPacket } from 'mysql2'

/**
 * GET - Debug dos números de WhatsApp dos clientes
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || user.tipo !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    
    // Buscar todos os clientes com seus números
    const clientes = await executeQuery(`
      SELECT 
        id,
        nome,
        whatsapp,
        LENGTH(REPLACE(whatsapp, REGEXP_REPLACE(whatsapp, '[0-9]', ''), '')) as tamanho_numerico,
        CASE 
          WHEN whatsapp REGEXP '^55[0-9]{11}$' THEN 'Formato correto (55 + 11 dígitos)'
          WHEN whatsapp REGEXP '^55[0-9]{10}$' THEN 'Formato correto (55 + 10 dígitos)'
          WHEN whatsapp REGEXP '^[0-9]{11}$' THEN 'Sem código do país (11 dígitos)'
          WHEN whatsapp REGEXP '^[0-9]{10}$' THEN 'Sem código do país (10 dígitos)'
          ELSE 'Formato inválido'
        END as formato_status,
        REPLACE(whatsapp, REGEXP_REPLACE(whatsapp, '[0-9]', ''), '') as apenas_numeros
      FROM clientes 
      WHERE whatsapp IS NOT NULL AND whatsapp != ''
      ORDER BY nome
    `) as RowDataPacket[]
    
    // Contar formatos
    const formatCount = clientes.reduce((acc, cliente) => {
      const status = cliente.formato_status
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Simular formatação para cada cliente
    const clientesComFormatacao = clientes.map(cliente => {
      let numeroLimpo = cliente.whatsapp.replace(/\D/g, '')
      
      // Simular formatação
      if (numeroLimpo.startsWith('0')) {
        numeroLimpo = numeroLimpo.substring(1)
      }
      
      let numeroFormatado = numeroLimpo
      let precisaAdicionar55 = false
      
      if (numeroLimpo.length === 11 && !numeroLimpo.startsWith('55')) {
        numeroFormatado = '55' + numeroLimpo
        precisaAdicionar55 = true
      } else if (numeroLimpo.length === 12 && !numeroLimpo.startsWith('55')) {
        numeroFormatado = '55' + numeroLimpo
        precisaAdicionar55 = true
      }
      
      return {
        ...cliente,
        numero_original: cliente.whatsapp,
        numero_limpo: numeroLimpo,
        numero_formatado: numeroFormatado,
        tamanho_final: numeroFormatado.length,
        precisa_adicionar_55: precisaAdicionar55,
        valido_para_envio: numeroFormatado.length >= 12 && numeroFormatado.length <= 13
      }
    })
    
    return NextResponse.json({
      total_clientes: clientes.length,
      formato_count: formatCount,
      clientes: clientesComFormatacao,
      problemas: clientesComFormatacao.filter(c => !c.valido_para_envio),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Erro ao debugar números de clientes:', error)
    return NextResponse.json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 