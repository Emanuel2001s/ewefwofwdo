"use client"

import { createContext, useContext, useEffect, useState } from 'react'

interface ConfigContextType {
  nomeSistema: string
  faviconUrl: string
  logoUrl: string
  refreshConfig: () => void
  isLoaded: boolean
}

const ConfigContext = createContext<ConfigContextType>({
  nomeSistema: '',
  faviconUrl: '/favicon.ico',
  logoUrl: '/placeholder-logo.png',
  refreshConfig: () => {},
  isLoaded: true
})

export function useConfig() {
  return useContext(ConfigContext)
}

interface ConfigProviderProps {
  children: React.ReactNode
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  // Tentar carregar do localStorage primeiro (instantâneo)
  const getStoredValue = (key: string, defaultValue: string) => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(`config_${key}`)
      return stored || defaultValue
    } catch {
      return defaultValue
    }
  }

  const [nomeSistema, setNomeSistema] = useState(() => getStoredValue('nome_sistema', ''))
  const [faviconUrl, setFaviconUrl] = useState(() => getStoredValue('favicon_url', '/favicon.ico'))
  const [logoUrl, setLogoUrl] = useState(() => getStoredValue('logo_url', '/placeholder-logo.png'))
  const [isLoaded, setIsLoaded] = useState(true) // Sempre começa carregado

  const fetchConfig = async () => {
    try {
      // Verificar se já temos cache recente (menos de 5 minutos)
      const lastFetch = localStorage.getItem('config_last_fetch')
      const now = Date.now()
      if (lastFetch && (now - parseInt(lastFetch)) < 5 * 60 * 1000) {
        // Cache ainda válido, não fazer nova requisição
        return
      }
      
      // Carregamento silencioso em background
      const response = await fetch('/api/configuracoes', {
        next: { revalidate: 60 },
        cache: 'force-cache'
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Aplicar configurações silenciosamente e salvar no localStorage
        let hasChanges = false
        data.forEach((config: any) => {
          switch (config.chave) {
            case 'nome_sistema':
              if (config.valor && config.valor !== nomeSistema) {
                setNomeSistema(config.valor)
                localStorage.setItem('config_nome_sistema', config.valor)
                // Atualizar title silenciosamente
                if (typeof window !== 'undefined') {
                  document.title = config.valor
                }
                hasChanges = true
              }
              break
            case 'favicon_url':
              if (config.valor && config.valor !== faviconUrl) {
                setFaviconUrl(config.valor)
                localStorage.setItem('config_favicon_url', config.valor)
                hasChanges = true
              }
              break
            case 'logo_url':
              if (config.valor && config.valor !== logoUrl) {
                setLogoUrl(config.valor)
                localStorage.setItem('config_logo_url', config.valor)
                hasChanges = true
              }
              break
          }
        })
        
        // Marcar timestamp da última busca
        if (typeof window !== 'undefined') {
          localStorage.setItem('config_last_fetch', Date.now().toString())
          
          // Salvar valores no localStorage se não existirem
          if (!hasChanges) {
            if (!localStorage.getItem('config_nome_sistema') && nomeSistema) {
              localStorage.setItem('config_nome_sistema', nomeSistema)
            }
            if (!localStorage.getItem('config_favicon_url')) {
              localStorage.setItem('config_favicon_url', faviconUrl)
            }
            if (!localStorage.getItem('config_logo_url')) {
              localStorage.setItem('config_logo_url', logoUrl)
            }
          }
        }
      }
      // Se API falhar, simplesmente não faz nada - mantém o que já estava carregado
    } catch (error) {
      console.log('Erro ao carregar configurações')
      // Em caso de erro, mantém o que já estava carregado
    } finally {
      setIsLoaded(true)
    }
  }

  useEffect(() => {
    // Aguardar hidratação completa antes de executar
    const timer = setTimeout(() => {
      // Carregar configurações silenciosamente em background
    fetchConfig()
    }, 500) // Delay maior para garantir hidratação completa
    
    return () => clearTimeout(timer)
  }, [])

  // Atualizar favicon apenas (title já é atualizado no fetchConfig)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Atualizar favicon
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (!link) {
      link = document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'shortcut icon'
      document.getElementsByTagName('head')[0].appendChild(link)
    }
    link.href = faviconUrl
  }, [faviconUrl])

  const refreshConfig = () => {
    setIsLoaded(false)
    fetchConfig()
  }

  return (
    <ConfigContext.Provider value={{
      nomeSistema,
      faviconUrl,
      logoUrl,
      refreshConfig,
      isLoaded
    }}>
      {children}
    </ConfigContext.Provider>
  )
} 