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
        const errorData = await response.json()
        console.error("Dados de erro da API (depuração):", JSON.stringify(errorData, null, 2)); // Stringify para ver o conteúdo completo

        toast({
          title: "Erro",
          description: errorData.error || "Ocorreu um erro desconhecido ao salvar o servidor.", // Usar diretamente a mensagem do backend
          variant: "destructive",
        });
        setIsLoading(false); // Parar o loading aqui, já que não vamos para o catch
        return; // Sair da função para não prosseguir
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
      console.error("Erro no handleSubmit do ServerForm (fallback do catch):", error) // Detalhar o log do catch
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.", // Mensagem genérica para erros não-HTTP
        variant: "destructive",
      })
    } finally {
      // O setIsLoading(false) agora é feito dentro do if (!response.ok) e no catch
      // Pode ser removido daqui ou mantido se houver outras saídas de sucesso/erro
       // setIsLoading(false)
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
