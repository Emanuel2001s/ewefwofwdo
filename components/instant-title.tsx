'use client'

import { useEffect } from 'react'
import { useConfig } from '@/components/config-provider'

export function InstantTitle() {
  const { nomeSistema } = useConfig()

  useEffect(() => {
    // Só executa no cliente após hidratação
    if (typeof window !== 'undefined') {
      // Primeiro, tenta carregar título do localStorage
      try {
        const storedTitle = localStorage.getItem('config_nome_sistema')
        if (storedTitle) {
          document.title = storedTitle
        }
      } catch (error) {
        // Se falhar, não faz nada
      }
      
      // Depois, se nomeSistema vier do contexto, usa ele
      if (nomeSistema) {
        document.title = nomeSistema
      }
    }
  }, [nomeSistema])

  // Este componente não renderiza nada visualmente
  return null
} 