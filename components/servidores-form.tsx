"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

export function ServidoresForm({ servidor = null }: { servidor?: { id: number; nome: string } | null }) {
  const router = useRouter()
  const [nome, setNome] = useState(servidor?.nome || "")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = servidor ? `/api/servidores/${servidor.id}` : "/api/servidores"
      const method = servidor ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome }),
      })

      if (!response.ok) {
        throw new Error("Erro ao salvar servidor")
      }

      toast({
        title: servidor ? "Servidor atualizado" : "Servidor adicionado",
        description: servidor
          ? `O servidor ${nome} foi atualizado com sucesso.`
          : `O servidor ${nome} foi adicionado com sucesso.`,
      })

      setNome("")
      router.refresh()
    } catch (error) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o servidor.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Servidor</Label>
        <Input
          id="nome"
          placeholder="Digite o nome do servidor"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Salvando..." : servidor ? "Atualizar Servidor" : "Adicionar Servidor"}
      </Button>
    </form>
  )
}
