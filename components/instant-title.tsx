'use client'

import { useEffect } from 'react'
import { useConfig } from '@/components/config-provider'

export function InstantTitle() {
  const { nomeSistema } = useConfig()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Carregar do localStorage ou usar padrão
    const storedTitle = localStorage.getItem('config_nome_sistema')
    document.title = storedTitle || 'Dashboard'
  }, []) // Executar apenas uma vez na montagem

  useEffect(() => {
    if (typeof window === 'undefined' || !nomeSistema) return
    document.title = nomeSistema
  }, [nomeSistema])

  // Este componente não renderiza nada visualmente
  return null
} 