"use client"

import { createContext, useContext, useEffect, useState } from 'react'

interface ConfigContextType {
  nomeSistema: string
  faviconUrl: string
  logoUrl: string
  refreshConfig: () => void
  isLoaded: boolean
  mounted: boolean
}

const ConfigContext = createContext<ConfigContextType>({
  nomeSistema: 'Dashboard',
  faviconUrl: '/favicon.ico',
  logoUrl: '/placeholder-logo.png',
  refreshConfig: () => {},
  isLoaded: false,
  mounted: false
})

export function useConfig() {
  return useContext(ConfigContext)
}

interface ConfigProviderProps {
  children: React.ReactNode
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [state, setState] = useState({
    nomeSistema: 'Dashboard',
    faviconUrl: '/favicon.ico',
    logoUrl: '/placeholder-logo.png',
    isLoaded: false,
    mounted: false
  })

  const loadStoredValues = () => {
    if (typeof window === 'undefined') return
    
    try {
      const storedNome = localStorage.getItem('config_nome_sistema')
      const storedFavicon = localStorage.getItem('config_favicon_url')
      const storedLogo = localStorage.getItem('config_logo_url')
      
      setState(prev => ({
        ...prev,
        nomeSistema: storedNome || prev.nomeSistema,
        faviconUrl: storedFavicon || prev.faviconUrl,
        logoUrl: storedLogo || prev.logoUrl
      }))

      if (storedNome) {
        document.title = storedNome
      }
    } catch (error) {
      console.log('Erro ao carregar configurações do localStorage')
    }
  }

  const fetchConfig = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const lastFetch = localStorage.getItem('config_last_fetch')
        const now = Date.now()
        if (lastFetch && (now - parseInt(lastFetch)) < 5 * 60 * 1000) {
          return
        }
      }
      
      const response = await fetch('/api/configuracoes', {
        ...(forceRefresh ? { cache: 'no-cache' } : { next: { revalidate: 60 } })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        const newState = { ...state }
        let hasChanges = false

        data.forEach((config: any) => {
          switch (config.chave) {
            case 'nome_sistema':
              if (config.valor && config.valor !== state.nomeSistema) {
                newState.nomeSistema = config.valor
                localStorage.setItem('config_nome_sistema', config.valor)
                document.title = config.valor
                hasChanges = true
              }
              break
            case 'favicon_url':
              if (config.valor && config.valor !== state.faviconUrl) {
                newState.faviconUrl = config.valor
                localStorage.setItem('config_favicon_url', config.valor)
                hasChanges = true
              }
              break
            case 'logo_url':
              if (config.valor && config.valor !== state.logoUrl) {
                newState.logoUrl = config.valor
                localStorage.setItem('config_logo_url', config.valor)
                hasChanges = true
              }
              break
          }
        })
        
        if (hasChanges) {
          setState(newState)
        }
        
        localStorage.setItem('config_last_fetch', Date.now().toString())
      }
    } catch (error) {
      console.log('Erro ao carregar configurações')
    } finally {
      setState(prev => ({ ...prev, isLoaded: true }))
    }
  }

  useEffect(() => {
    setState(prev => ({ ...prev, mounted: true }))
    loadStoredValues()
    
    const timer = setTimeout(() => {
      fetchConfig()
    }, 1000)
    
    const handleForceRefresh = (event: any) => {
      const { nomeSistema: newNome, faviconUrl: newFavicon, logoUrl: newLogo } = event.detail
      
      setState(prev => ({
        ...prev,
        ...(newNome && { nomeSistema: newNome }),
        ...(newFavicon && { faviconUrl: newFavicon }),
        ...(newLogo && { logoUrl: newLogo })
      }))
    }
    
    window.addEventListener('forceConfigRefresh', handleForceRefresh)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('forceConfigRefresh', handleForceRefresh)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (!link) {
      link = document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'shortcut icon'
      document.getElementsByTagName('head')[0].appendChild(link)
    }
    link.href = state.faviconUrl
  }, [state.faviconUrl])

  const refreshConfig = () => {
    fetchConfig(true)
  }

  const value = {
    ...state,
    refreshConfig
  }

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  )
} 