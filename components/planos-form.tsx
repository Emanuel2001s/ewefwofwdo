"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

export function PlanosForm({ plano = null }: { plano?: { id: number; nome: string; valor: number } | null }) {
  const router = useRouter()
  const [nome, setNome] = useState(plano?.nome || "")
  const [valor, setValor] = useState(plano?.valor?.toString() || "")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = plano ? `/api/planos/${plano.id}` : "/api/planos"
      const method = plano ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          valor: Number.parseFloat(valor.replace(",", ".")),
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao salvar plano")
      }

      toast({
        title: plano ? "Plano atualizado" : "Plano adicionado",
        description: plano
          ? `O plano ${nome} foi atualizado com sucesso.`
          : `O plano ${nome} foi adicionado com sucesso.`,
      })

      setNome("")
      setValor("")
      router.refresh()
    } catch (error) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o plano.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatarValor = (valor: string) => {
    // Remove tudo que não for número ou vírgula
    valor = valor.replace(/[^\d,]/g, "")

    // Garante que só tenha uma vírgula
    const partes = valor.split(",")
    if (partes.length > 2) {
      valor = partes[0] + "," + partes.slice(1).join("")
    }

    // Limita a 2 casas decimais
    if (partes.length > 1 && partes[1].length > 2) {
      valor = partes[0] + "," + partes[1].substring(0, 2)
    }

    return valor
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Plano</Label>
        <Input
          id="nome"
          placeholder="Ex: Plano Básico 1 Tela"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="valor">Valor (R$)</Label>
        <Input
          id="valor"
          placeholder="Ex: 29,90"
          value={valor}
          onChange={(e) => setValor(formatarValor(e.target.value))}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Salvando..." : plano ? "Atualizar Plano" : "Adicionar Plano"}
      </Button>
    </form>
  )
}
