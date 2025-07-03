'use client'

import { useState, useEffect } from 'react'

interface ConfigData {
  nomeSistema: string
  logoUrl: string
  faviconUrl: string
  isLoaded: boolean
}

export function useConfig(): ConfigData {
  const [config, setConfig] = useState<ConfigData>({
    nomeSistema: 'Dashboard', // Valor padrão imediato
    logoUrl: '/placeholder-logo.png',
    faviconUrl: '/favicon.ico',
    isLoaded: true // Começa carregado com padrões
  })

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/configuracoes', {
          next: { revalidate: 60 }, // Cache de 60 segundos
          cache: 'force-cache'
        })
        
        if (response.ok) {
          const data = await response.json()
          const newConfig: Partial<ConfigData> = {}
          
          data.forEach((item: any) => {
            switch (item.chave) {
              case 'nome_sistema':
                if (item.valor) {
                  newConfig.nomeSistema = item.valor
                  // Atualizar title imediatamente
                  if (typeof window !== 'undefined') {
                    document.title = item.valor
                  }
                }
                break
              case 'logo_url':
                if (item.valor) newConfig.logoUrl = item.valor
                break
              case 'favicon_url':
                if (item.valor) newConfig.faviconUrl = item.valor
                break
            }
          })
          
          setConfig(prev => ({ ...prev, ...newConfig, isLoaded: true }))
        } else {
          // Fallback
          setConfig(prev => ({ 
            ...prev, 
            nomeSistema: 'Dashboard', 
            isLoaded: true 
          }))
        }
      } catch (error) {
        console.log('Erro ao carregar config:', error)
        setConfig(prev => ({ 
          ...prev, 
          nomeSistema: 'Dashboard', 
          isLoaded: true 
        }))
      }
    }

    loadConfig()
  }, [])

  return config
} 