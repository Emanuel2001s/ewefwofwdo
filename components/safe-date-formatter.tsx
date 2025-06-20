'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMounted } from '@/lib/use-mounted'

interface SafeDateFormatterProps {
  date: string | Date
  formatString?: string
  fallback?: string
}

export function SafeDateFormatter({ 
  date, 
  formatString = 'dd/MM/yyyy', 
  fallback = '--' 
}: SafeDateFormatterProps) {
  const mounted = useMounted()

  if (!mounted) {
    return <span>{fallback}</span>
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return <span>{format(dateObj, formatString, { locale: ptBR })}</span>
  } catch (error) {
    return <span>{fallback}</span>
  }
}

interface SafeCurrencyFormatterProps {
  value: number
  fallback?: string
}

export function SafeCurrencyFormatter({ 
  value, 
  fallback = 'R$ --' 
}: SafeCurrencyFormatterProps) {
  const mounted = useMounted()

  if (!mounted) {
    return <span>{fallback}</span>
  }

  try {
    return (
      <span>
        {value.toLocaleString("pt-BR", { 
          style: "currency", 
          currency: "BRL" 
        })}
      </span>
    )
  } catch (error) {
    return <span>{fallback}</span>
  }
} 