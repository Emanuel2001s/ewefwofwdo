"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAuto } from "@/lib/auth"
import { loginSchema, type LoginFormData } from "@/lib/validations"
import { useConfig } from "@/components/config-provider"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState("")
  const [senha, setSenha] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({})
  const { nomeSistema, logoUrl, refreshConfig } = useConfig()
  
  // **ESTADOS LOCAIS COMPATÍVEIS COM SSR**
  // Sempre começar com valores padrão para evitar problemas de hidratação
  const [currentLogoUrl, setCurrentLogoUrl] = useState('/placeholder-logo.png')
  const [currentNomeSistema, setCurrentNomeSistema] = useState('Dashboard')
  const [mounted, setMounted] = useState(false)
  
  // **CARREGAR VALORES DO LOCALSTORAGE APÓS HIDRATAÇÃO**
  useEffect(() => {
    setMounted(true)
    
    if (typeof window !== 'undefined') {
      try {
        const storedLogo = localStorage.getItem('config_logo_url')
        const storedNome = localStorage.getItem('config_nome_sistema')
        
        if (storedLogo) setCurrentLogoUrl(storedLogo)
        if (storedNome) {
          setCurrentNomeSistema(storedNome)
          document.title = storedNome
        }
      } catch (error) {
        console.log('Erro ao carregar configurações do localStorage')
      }
    }
  }, [])

  // **SINCRONIZAR COM CONTEXTO**
  useEffect(() => {
    if (logoUrl) {
      setCurrentLogoUrl(logoUrl)
    }
  }, [logoUrl])
  
  useEffect(() => {
    if (nomeSistema) {
      setCurrentNomeSistema(nomeSistema)
    }
  }, [nomeSistema])

  // **FORÇAR REFRESH DA LOGO QUANDO NECESSÁRIO**
  useEffect(() => {
    const handleForceRefresh = (event: any) => {
      console.log('🔄 Force refresh recebido na página de login')
      
      // **ATUALIZAR ESTADOS LOCAIS IMEDIATAMENTE**
      const { nomeSistema: newNome, logoUrl: newLogo } = event.detail
      if (newNome) {
        setCurrentNomeSistema(newNome)
      }
      if (newLogo) {
        setCurrentLogoUrl(newLogo)
      }
      
      // Também chamar refresh do contexto
      refreshConfig()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('forceConfigRefresh', handleForceRefresh)
      return () => window.removeEventListener('forceConfigRefresh', handleForceRefresh)
    }
  }, [refreshConfig])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setFieldErrors({})

    // Validar dados com Zod
    const validationResult = loginSchema.safeParse({ usuario, senha })
    
    if (!validationResult.success) {
      const errors: {[key: string]: string} = {}
      validationResult.error.errors.forEach((error) => {
        if (error.path[0]) {
          errors[error.path[0] as string] = error.message
        }
      })
      setFieldErrors(errors)
      setIsLoading(false)
      return
    }

    try {
      // Usa a função loginAuto que tenta admin primeiro, depois cliente
      const user = await loginAuto(usuario, senha)
      
      // Redireciona baseado no tipo de usuário
      if (user.tipo === "admin") {
        router.push("/admin/dashboard")
      } else if (user.tipo === "cliente") {
        router.push("/cliente/dashboard")
      }
    } catch (err) {
      setError("Usuário ou senha incorretos. Verifique suas credenciais e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-sm mx-auto">
        {/* Header */}
        <div className={`text-center mb-8 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {/* Logo */}
          {mounted && currentLogoUrl && currentLogoUrl !== '/placeholder-logo.png' && (
            <div className="mb-4 flex justify-center animate-in fade-in duration-500">
              <Image
                src={currentLogoUrl}
                alt="Logo"
                width={120}
                height={120}
                className="max-w-[120px] max-h-[120px] object-contain"
                key={currentLogoUrl}
                unoptimized={true}
                priority={true}
                onError={(e) => {
                  console.log('Erro ao carregar logo:', currentLogoUrl)
                }}
              />
            </div>
          )}
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
            {mounted ? currentNomeSistema : 'Dashboard'}
          </h1>
        </div>

        {/* Login Card */}
        <Card className="w-full">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm font-medium text-destructive text-center p-3 bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuário</Label>
                <Input
                  id="usuario"
                  type="text"
                  placeholder="Digite seu usuário"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                  className={fieldErrors.usuario ? "border-destructive" : ""}
                />
                {fieldErrors.usuario && (
                  <p className="text-sm text-destructive">{fieldErrors.usuario}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className={fieldErrors.senha ? "border-destructive" : ""}
                />
                {fieldErrors.senha && (
                  <p className="text-sm text-destructive">{fieldErrors.senha}</p>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
