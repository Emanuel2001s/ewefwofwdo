"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ClienteFormProps {
  cliente?: {
    id: number
    nome: string
    whatsapp: string
    data_vencimento: string
    plano_id: number
    servidor_id: number
    observacoes: string
    dispositivos: string
    status: "ativo" | "inativo"
    usuario_id?: number
  } | null
  servidores: { id: number; nome: string }[]
  planos: { id: number; nome: string; valor: number }[]
}

const dispositivosOpcoes = [
  { id: "TV", label: "TV" },
  { id: "Celular", label: "Celular" },
  { id: "PC", label: "PC" },
  { id: "Notebook", label: "Notebook" },
]

export function ClienteForm({ cliente = null, servidores, planos }: ClienteFormProps) {
  const router = useRouter()

  const [formData, setFormData] = useState({
    nome: cliente?.nome || "",
    whatsapp: cliente?.whatsapp || "",
    data_vencimento: cliente?.data_vencimento ? new Date(cliente.data_vencimento) : new Date(),
    plano_id: cliente?.plano_id?.toString() || "",
    servidor_id: cliente?.servidor_id?.toString() || "",
    observacoes: cliente?.observacoes || "",
    dispositivos: cliente?.dispositivos ? cliente.dispositivos.split(",") : [],
    status: cliente?.status || "ativo",
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      dispositivos: checked ? [...prev.dispositivos, id] : prev.dispositivos.filter((item) => item !== id),
    }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, data_vencimento: date }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = cliente ? `/api/clientes/${cliente.id}` : "/api/clientes"
      const method = cliente ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          plano_id: Number.parseInt(formData.plano_id),
          servidor_id: Number.parseInt(formData.servidor_id),
          dispositivos: formData.dispositivos.join(","),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao salvar cliente")
      }

      toast({
        title: cliente ? "Cliente atualizado" : "Cliente adicionado",
        description: cliente
          ? `O cliente ${formData.nome} foi atualizado com sucesso.`
          : `O cliente ${formData.nome} foi adicionado com sucesso.`,
      })

      router.push("/admin/clientes")
    } catch (error) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar o cliente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatarWhatsApp = (valor: string) => {
    // Remove tudo que não for número
    valor = valor.replace(/\D/g, "")

    // Formata como (99) 99999-9999
    if (valor.length <= 11) {
      valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2")
      valor = valor.replace(/(\d)(\d{4})$/, "$1-$2")
    }

    return valor
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Cliente</Label>
          <Input
            id="nome"
            name="nome"
            placeholder="Nome completo do cliente"
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            placeholder="(99) 99999-9999"
            value={formData.whatsapp}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                whatsapp: formatarWhatsApp(e.target.value),
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_vencimento">Data de Vencimento</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.data_vencimento && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.data_vencimento ? (
                  format(formData.data_vencimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={formData.data_vencimento} onSelect={handleDateChange} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plano_id">Plano</Label>
          <Select value={formData.plano_id} onValueChange={(value) => handleSelectChange("plano_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o plano" />
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
          <Label htmlFor="servidor_id">Servidor</Label>
          <Select value={formData.servidor_id} onValueChange={(value) => handleSelectChange("servidor_id", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o servidor" />
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
      </div>

      <div className="space-y-2">
        <Label>Dispositivos</Label>
        <div className="flex flex-wrap gap-6">
          {dispositivosOpcoes.map((dispositivo) => (
            <div key={dispositivo.id} className="flex items-center space-x-2">
              <Checkbox
                id={`dispositivo-${dispositivo.id}`}
                checked={formData.dispositivos.includes(dispositivo.id)}
                onCheckedChange={(checked) => handleCheckboxChange(dispositivo.id, checked as boolean)}
              />
              <Label htmlFor={`dispositivo-${dispositivo.id}`} className="text-sm font-normal">
                {dispositivo.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          placeholder="Observações sobre o cliente"
          value={formData.observacoes}
          onChange={handleChange}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/clientes")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : cliente ? "Atualizar Cliente" : "Adicionar Cliente"}
        </Button>
      </div>
    </form>
  )
}
