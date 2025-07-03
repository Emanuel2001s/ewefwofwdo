'use client'

import { useEffect } from 'react'
import { useConfig } from '@/components/config-provider'

export function InstantTitle() {
  const { nomeSistema } = useConfig()

  useEffect(() => {
    // **CARREGAR TÍTULO IMEDIATAMENTE**
    if (typeof window !== 'undefined') {
      // Primeiro, tentar carregar do localStorage imediatamente
      try {
        const storedTitle = localStorage.getItem('config_nome_sistema')
        if (storedTitle) {
          document.title = storedTitle
        } else {
          // Se não tiver no localStorage, usar padrão
          document.title = 'Dashboard'
        }
      } catch (error) {
        // Se falhar, usar padrão
        document.title = 'Dashboard'
      }
    }
  }, []) // Executar apenas uma vez na montagem

  useEffect(() => {
    // Atualizar quando nomeSistema mudar
    if (typeof window !== 'undefined' && nomeSistema) {
      document.title = nomeSistema
    }
  }, [nomeSistema])

  // Este componente não renderiza nada visualmente
  return null
} 