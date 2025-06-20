"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

interface ServerFormProps {
  servidor?: { id: number; nome: string } | null
}

export function ServerForm({ servidor }: ServerFormProps) {
  const router = useRouter()
  const [nome, setNome] = useState(servidor?.nome || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (servidor) {
      setNome(servidor.nome)
    }
  }, [servidor])

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
        const errorData = await response.json()
        console.error("Dados de erro da API:", errorData)
        throw new Error(errorData.error)
      }

      toast({
        title: servidor ? "Servidor atualizado" : "Servidor adicionado",
        description: servidor
          ? `O servidor \"${nome}\" foi atualizado com sucesso.`
          : `O servidor \"${nome}\" foi adicionado com sucesso.`,
      })

      router.push("/admin/servidores")
      router.refresh() // Força a atualização dos dados na tabela
    } catch (error) {
      console.error("Erro no handleSubmit do ServerForm:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : JSON.stringify(error),
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
          name="nome"
          placeholder="Nome do servidor"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Salvando..." : "Salvar Servidor"}
      </Button>
    </form>
  )
} 