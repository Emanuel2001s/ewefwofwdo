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
  nomeSistema: 'Dashboard IPTV',
  faviconUrl: '/favicon.ico',
  logoUrl: '/placeholder-logo.png',
  refreshConfig: () => {},
  isLoaded: false
})

export function useConfig() {
  return useContext(ConfigContext)
}

interface ConfigProviderProps {
  children: React.ReactNode
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [nomeSistema, setNomeSistema] = useState('Dashboard IPTV')
  const [faviconUrl, setFaviconUrl] = useState('/favicon.ico')
  const [logoUrl, setLogoUrl] = useState('/placeholder-logo.png')
  const [isLoaded, setIsLoaded] = useState(false)

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/configuracoes')
      if (response.ok) {
        const data = await response.json()
        
        data.forEach((config: any) => {
          switch (config.chave) {
            case 'nome_sistema':
              setNomeSistema(config.valor || 'Dashboard IPTV')
              break
            case 'favicon_url':
              setFaviconUrl(config.valor || '/favicon.ico')
              break
            case 'logo_url':
              setLogoUrl(config.valor || '/placeholder-logo.png')
              break
          }
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setIsLoaded(true)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  // Atualizar favicon e title apenas no cliente
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded) return
    
    // Atualizar favicon
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (!link) {
      link = document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'shortcut icon'
      document.getElementsByTagName('head')[0].appendChild(link)
    }
    link.href = faviconUrl
    
    // Atualizar title
    document.title = nomeSistema
  }, [faviconUrl, nomeSistema, isLoaded])

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