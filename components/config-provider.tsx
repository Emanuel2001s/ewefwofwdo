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
  nomeSistema: '',
  faviconUrl: '/favicon.ico',
  logoUrl: '/placeholder-logo.png',
  refreshConfig: () => {},
  isLoaded: true,
  mounted: false
})

export function useConfig() {
  return useContext(ConfigContext)
}

interface ConfigProviderProps {
  children: React.ReactNode
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  // **ESTADOS INICIAIS COMPATÍVEIS COM SSR**
  // Sempre começar com valores padrão para evitar problemas de hidratação
  const [nomeSistema, setNomeSistema] = useState('Dashboard')
  const [faviconUrl, setFaviconUrl] = useState('/favicon.ico')
  const [logoUrl, setLogoUrl] = useState('/placeholder-logo.png')
  const [isLoaded, setIsLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)

  // **CARREGAR VALORES DO LOCALSTORAGE APÓS HIDRATAÇÃO**
  const loadStoredValues = () => {
    if (typeof window === 'undefined') return
    
    try {
      const storedNome = localStorage.getItem('config_nome_sistema')
      const storedFavicon = localStorage.getItem('config_favicon_url')
      const storedLogo = localStorage.getItem('config_logo_url')
      
      // Atualizar apenas se valores existirem e forem diferentes
      if (storedNome && storedNome !== nomeSistema) {
        setNomeSistema(storedNome)
        // Atualizar título imediatamente
        document.title = storedNome
      }
      if (storedFavicon && storedFavicon !== faviconUrl) {
        setFaviconUrl(storedFavicon)
      }
      if (storedLogo && storedLogo !== logoUrl) {
        setLogoUrl(storedLogo)
      }
    } catch (error) {
      console.log('Erro ao carregar configurações do localStorage')
    }
  }

  const fetchConfig = async (forceRefresh = false) => {
    try {
      // Verificar se já temos cache recente (menos de 5 minutos) - APENAS se não forçar refresh
      if (!forceRefresh) {
        const lastFetch = localStorage.getItem('config_last_fetch')
        const now = Date.now()
        if (lastFetch && (now - parseInt(lastFetch)) < 5 * 60 * 1000) {
          // Cache ainda válido, não fazer nova requisição
          return
        }
      }
      
      // Carregamento silencioso em background
      const response = await fetch('/api/configuracoes', {
        // Se forçar refresh, não usar cache
        ...(forceRefresh ? { cache: 'no-cache' } : { next: { revalidate: 60 }, cache: 'force-cache' })
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
    // Aguardar hidratação e marcar como montado
    setMounted(true)
    
    // **CARREGAR VALORES DO LOCALSTORAGE IMEDIATAMENTE APÓS HIDRATAÇÃO**
    loadStoredValues()
    
    setIsLoaded(true)
    
    // Carregar configurações do servidor em background
    const timer = setTimeout(() => {
      fetchConfig()
    }, 1000)
    
    // **LISTENER PARA FORCE REFRESH**
    const handleForceRefresh = (event: any) => {
      console.log('📡 ConfigProvider recebeu forceConfigRefresh:', event.detail)
      const { nomeSistema: newNome, faviconUrl: newFavicon, logoUrl: newLogo } = event.detail
      if (newNome) {
        console.log('🔄 Atualizando nome do sistema:', newNome)
        setNomeSistema(newNome)
      }
      if (newFavicon) {
        console.log('🔄 Atualizando favicon:', newFavicon)
        setFaviconUrl(newFavicon)
      }
      if (newLogo) {
        console.log('🔄 Atualizando logo:', newLogo)
        setLogoUrl(newLogo)
      }
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('forceConfigRefresh', handleForceRefresh)
    }
    
    return () => {
      clearTimeout(timer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('forceConfigRefresh', handleForceRefresh)
      }
    }
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
    
    // **LIMPAR CACHE DO LOCALSTORAGE**
    if (typeof window !== 'undefined') {
      localStorage.removeItem('config_last_fetch')
    }
    
    fetchConfig(true) // Forçar refresh
  }

  return (
    <ConfigContext.Provider value={{
      nomeSistema,
      faviconUrl,
      logoUrl,
      refreshConfig,
      isLoaded,
      mounted
    }}>
      {children}
    </ConfigContext.Provider>
  )
} 