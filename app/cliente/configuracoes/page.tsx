"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { User, Lock, Eye, EyeOff, Save, Copy } from "lucide-react"
import { getAuthUser } from "@/lib/auth"
import { useEffect } from "react"

interface ClienteData {
  id: number
  nome: string
  email: string
  usuario: string
  tipo: string
}

export default function ConfiguracoesPage() {
  const [clienteData, setClienteData] = useState<ClienteData | null>(null)
  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchClienteData = async () => {
      try {
        const user = await getAuthUser()
        if (user) {
          setClienteData(user as ClienteData)
        }
      } catch (error) {
        console.error("Erro ao buscar dados do cliente:", error)
      }
    }

    fetchClienteData()
  }, [])

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    if (novaSenha !== confirmarSenha) {
      toast({
        title: "Erro",
        description: "A nova senha e a confirmação não coincidem.",
        variant: "destructive",
      })
      return
    }

    if (novaSenha.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/cliente/alterar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senhaAtual,
          novaSenha,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Senha alterada com sucesso!",
        })
        setSenhaAtual("")
        setNovaSenha("")
        setConfirmarSenha("")
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao alterar senha.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "Usuário copiado para a área de transferência!",
    })
  }

  if (!clienteData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Configurações
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie suas informações de acesso
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card de Informações da Conta - Compacto */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações da Conta
              </CardTitle>
              <CardDescription className="text-blue-100">
                Dados da sua conta (apenas visualização)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nome Completo
                </Label>
                <Input 
                  value={clienteData.nome} 
                  readOnly 
                  className="bg-gray-50 dark:bg-gray-800 mt-1" 
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Usuário
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    value={clienteData.usuario} 
                    readOnly 
                    className="bg-gray-50 dark:bg-gray-800" 
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(clienteData.usuario)}
                    className="px-3"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use este usuário para fazer login no sistema
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card de Alterar Senha */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="bg-red-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription className="text-red-100">
                Mantenha sua conta segura alterando sua senha regularmente
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAlterarSenha} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha Atual
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showSenhaAtual ? "text" : "password"}
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      className="pr-10"
                      placeholder="Digite sua senha atual"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                    >
                      {showSenhaAtual ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nova Senha
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNovaSenha ? "text" : "password"}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="pr-10"
                      placeholder="Digite sua nova senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNovaSenha(!showNovaSenha)}
                    >
                      {showNovaSenha ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Mínimo de 6 caracteres
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirmarSenha ? "text" : "password"}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      className="pr-10"
                      placeholder="Confirme sua nova senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                    >
                      {showConfirmarSenha ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-red-600 hover:bg-red-700" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    "Alterando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Card de Dicas de Segurança */}
      <Card className="mt-6 border-yellow-200 dark:border-yellow-800">
        <CardHeader className="bg-yellow-50 dark:bg-yellow-950 rounded-t-lg">
          <CardTitle className="text-yellow-800 dark:text-yellow-200 text-lg">
            💡 Dicas de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">•</span>
              Use uma senha forte com pelo menos 8 caracteres
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">•</span>
              Inclua letras maiúsculas, minúsculas, números e símbolos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">•</span>
              Não compartilhe suas credenciais com outras pessoas
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">•</span>
              Altere sua senha regularmente para manter sua conta segura
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 