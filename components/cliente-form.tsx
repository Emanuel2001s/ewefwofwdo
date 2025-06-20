"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { Eye, EyeOff, User, Phone, Calendar, CreditCard, Server, Settings, Shield, Save, ArrowLeft } from "lucide-react"

interface Cliente {
  id: number
  nome: string
  whatsapp: string
  data_vencimento: string | Date
  data_ativacao?: string | Date
  plano_id: number
  servidor_id: number
  observacoes: string
  dispositivos: string
  status: "ativo" | "inativo"
  usuario?: string
  senha?: string
}

interface ClienteFormProps {
  initialData?: Cliente | null
  servidores: { id: number; nome: string }[]
  planos: { id: number; nome: string; valor: number; duracao_dias: number }[]
}

const dispositivosOpcoes = [
  { id: "TV", label: "📺 TV" },
  { id: "Celular", label: "📱 Celular" },
  { id: "PC", label: "🖥️ PC" },
  { id: "Notebook", label: "💻 Notebook" },
]

export function ClienteForm({ initialData = null, servidores, planos }: ClienteFormProps) {
  const router = useRouter()

  const [formData, setFormData] = useState({
    nome: initialData?.nome || "",
    whatsapp: initialData?.whatsapp || "",
    data_vencimento: initialData?.data_vencimento ? new Date(initialData.data_vencimento) : new Date(),
    data_ativacao: initialData?.data_ativacao ? new Date(initialData.data_ativacao) : new Date(),
    plano_id: initialData?.plano_id?.toString() || "",
    servidor_id: initialData?.servidor_id?.toString() || "",
    observacoes: initialData?.observacoes || "",
    dispositivos: String(initialData?.dispositivos || "").split(","),
    status: initialData?.status || "ativo",
    usuarioLogin: initialData?.usuario || "",
    senhaLogin: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [usuarioStatus, setUsuarioStatus] = useState<{
    checking: boolean
    available: boolean | null
    message: string
  }>({
    checking: false,
    available: null,
    message: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }
      
      // Se mudou o plano, calcular nova data de vencimento automaticamente
      if (name === 'plano_id' && value) {
        const planoSelecionado = planos.find(p => p.id.toString() === value)
        if (planoSelecionado && planoSelecionado.duracao_dias) {
          const dataAtivacao = newData.data_ativacao instanceof Date ? newData.data_ativacao : new Date()
          const dataVencimento = new Date(dataAtivacao)
          dataVencimento.setDate(dataAtivacao.getDate() + planoSelecionado.duracao_dias)
          newData.data_vencimento = dataVencimento
        }
      }
      
      return newData
    })
  }

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      dispositivos: checked ? [...prev.dispositivos, id] : prev.dispositivos.filter((item) => item !== id),
    }))
  }

  const handleDateChange = (field: 'data_vencimento' | 'data_ativacao') => (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => {
        const newData = { ...prev, [field]: date }
        
        // Se mudou data_ativacao, recalcular vencimento
        if (field === 'data_ativacao' && prev.plano_id) {
          const planoSelecionado = planos.find(p => p.id.toString() === prev.plano_id)
          if (planoSelecionado && planoSelecionado.duracao_dias) {
            const dataVencimento = new Date(date)
            dataVencimento.setDate(date.getDate() + planoSelecionado.duracao_dias)
            newData.data_vencimento = dataVencimento
          }
        }
        
        return newData
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = initialData ? `/api/clientes/${initialData.id}` : "/api/clientes"
      const method = initialData ? "PUT" : "POST"

      const body: Record<string, any> = {
        ...formData,
        plano_id: Number.parseInt(formData.plano_id),
        servidor_id: Number.parseInt(formData.servidor_id),
        dispositivos: formData.dispositivos.join(","),
      };

      // Adicionar usuario e senha condicionalmente
      if (initialData) {
        if (formData.usuarioLogin !== (initialData.usuario || "")) {
          body.usuarioLogin = formData.usuarioLogin;
        } else {
          delete body.usuarioLogin;
        }

        if (formData.senhaLogin.trim() !== "") {
          body.senhaLogin = formData.senhaLogin;
        } else {
          delete body.senhaLogin;
        }
      } else {
        body.usuario = formData.usuarioLogin;
        body.senha = formData.senhaLogin;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Dados de erro da API (depuração):", JSON.stringify(errorData, null, 2));

        toast({
          title: "Erro",
          description: errorData.error || "Ocorreu um erro desconhecido ao salvar o cliente.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: initialData ? "Cliente atualizado" : "Cliente adicionado",
        description: initialData
          ? `O cliente ${formData.nome} foi atualizado com sucesso.`
          : `O cliente ${formData.nome} foi adicionado com sucesso.`
      })

      router.push("/admin/clientes")
    } catch (error) {
      console.error("Erro no handleSubmit do ClienteForm (fallback do catch):", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    } finally {
      // setIsLoading(false)
    }
  }

  const formatarWhatsApp = (valor: string) => {
    // Remove tudo que não for número
    valor = valor.replace(/\D/g, "")

    // Limita a 11 dígitos
    if (valor.length > 11) {
      valor = valor.substring(0, 11)
    }

    // Formata como (99) 99999-9999
    if (valor.length <= 11) {
      valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2")
      valor = valor.replace(/(\d)(\d{4})$/, "$1-$2")
    }

    return valor
  }

  const verificarUsuarioDisponivel = async (usuario: string) => {
    if (!usuario || usuario.length < 3) {
      setUsuarioStatus({
        checking: false,
        available: null,
        message: ""
      })
      return
    }

    setUsuarioStatus(prev => ({ ...prev, checking: true }))

    try {
      const response = await fetch('/api/clientes/check-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario,
          clienteId: initialData?.id || null
        })
      })

      const data = await response.json()

      setUsuarioStatus({
        checking: false,
        available: data.disponivel,
        message: data.message
      })
    } catch (error) {
      setUsuarioStatus({
        checking: false,
        available: null,
        message: "Erro ao verificar usuário"
      })
    }
  }

  // Debounce para verificação de usuário
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const handleUsuarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    setFormData(prev => ({ ...prev, usuarioLogin: valor }))

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      verificarUsuarioDisponivel(valor)
    }, 500)
  }

  // Cleanup effect para limpar timer quando componente for desmontado
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  const planoSelecionado = planos.find(p => p.id.toString() === formData.plano_id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            {initialData ? "Editar Cliente" : "Novo Cliente"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {initialData ? "Atualize os dados do cliente" : "Adicione um novo cliente ao sistema"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Principal */}
          <Card className="shadow-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-lg">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Dados Básicos */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm font-medium">
                    Nome Completo *
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Digite o nome completo"
                    required
                    className="focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-sm font-medium">
                    WhatsApp * <span className="text-xs text-gray-500">(11 dígitos)</span>
                  </Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    value={formatarWhatsApp(formData.whatsapp)}
                    onChange={(e) => {
                      const valorLimpo = e.target.value.replace(/\D/g, '')
                      if (valorLimpo.length <= 11) {
                        setFormData(prev => ({ ...prev, whatsapp: e.target.value }))
                      }
                    }}
                    placeholder="(99) 99999-9999"
                    required
                    maxLength={15} // (99) 99999-9999 = 15 caracteres com formatação
                    className="focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Digite apenas o número com DDD (será salvo automaticamente com código do Brasil +55)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usuarioLogin" className="text-sm font-medium">
                    Usuário de Login *
                  </Label>
                  <div className="relative">
                  <Input
                    id="usuarioLogin"
                    name="usuarioLogin"
                    value={formData.usuarioLogin}
                      onChange={handleUsuarioChange}
                    placeholder="Digite o usuário para login"
                    required
                      className={cn(
                        "focus:border-blue-500 pr-10",
                        usuarioStatus.available === false && "border-red-500",
                        usuarioStatus.available === true && "border-green-500"
                      )}
                    />
                    {usuarioStatus.checking && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                    {!usuarioStatus.checking && usuarioStatus.available === true && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                        ✓
                      </div>
                    )}
                    {!usuarioStatus.checking && usuarioStatus.available === false && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                        ✗
                      </div>
                    )}
                  </div>
                  {usuarioStatus.message && (
                    <p className={cn(
                      "text-xs",
                      usuarioStatus.available === true ? "text-green-600" : "text-red-600"
                    )}>
                      {usuarioStatus.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senhaLogin" className="text-sm font-medium">
                    Senha de Login {!initialData && "*"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="senhaLogin"
                      name="senhaLogin"
                      type={showPassword ? "text" : "password"}
                      value={formData.senhaLogin}
                      onChange={handleChange}
                      placeholder={initialData ? "Deixe em branco para manter a atual" : "Digite a senha"}
                      required={!initialData}
                      className="focus:border-blue-500 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plano_id" className="text-sm font-medium">
                    Plano *
                  </Label>
                  <Select value={formData.plano_id} onValueChange={(value) => handleSelectChange("plano_id", value)}>
                    <SelectTrigger className="focus:border-blue-500">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {planos.map((plano) => (
                        <SelectItem key={plano.id} value={plano.id.toString()}>
                          {plano.nome} - {plano.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="servidor_id" className="text-sm font-medium">
                    Servidor *
                  </Label>
                  <Select value={formData.servidor_id} onValueChange={(value) => handleSelectChange("servidor_id", value)}>
                    <SelectTrigger className="focus:border-blue-500">
                      <SelectValue placeholder="Selecione um servidor" />
                    </SelectTrigger>
                    <SelectContent>
                      {servidores.map((servidor) => (
                        <SelectItem key={servidor.id} value={servidor.id.toString()}>
                          {servidor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                    <SelectTrigger className="focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">✅ Ativo</SelectItem>
                      <SelectItem value="inativo">❌ Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Datas */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data de Ativação</Label>
                  <CustomCalendar
                    selected={formData.data_ativacao}
                    onSelect={handleDateChange('data_ativacao')}
                    className="border focus:border-blue-500 rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data de Vencimento</Label>
                  <CustomCalendar
                    selected={formData.data_vencimento}
                    onSelect={handleDateChange('data_vencimento')}
                    className="border focus:border-blue-500 rounded-md"
                  />
                </div>
              </div>

              {/* Dispositivos */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Dispositivos Permitidos</Label>
                <div className="grid grid-cols-2 gap-3">
                  {dispositivosOpcoes.map((dispositivo) => (
                    <div key={dispositivo.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={dispositivo.id}
                        checked={formData.dispositivos.includes(dispositivo.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(dispositivo.id, checked as boolean)}
                      />
                      <Label htmlFor={dispositivo.id} className="text-sm">
                        {dispositivo.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-sm font-medium">
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Observações sobre o cliente (opcional)"
                  rows={3}
                  className="focus:border-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/clientes")}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || 
                usuarioStatus.checking || 
                (usuarioStatus.available === false && formData.usuarioLogin.length > 0)
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Salvando..." : (initialData ? "Atualizar" : "Salvar")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
