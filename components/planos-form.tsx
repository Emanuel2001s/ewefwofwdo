"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

export function PlanosForm({ plano = null }: { plano?: { id: number; nome: string; valor: number; duracao_dias?: number } | null }) {
  const router = useRouter()
  const [nome, setNome] = useState(plano?.nome || "")
  const [valor, setValor] = useState(plano?.valor?.toString() || "")
  const [duracaoDias, setDuracaoDias] = useState(plano?.duracao_dias?.toString() || "30")
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
          duracao_dias: Number.parseInt(duracaoDias),
        }),
      })

      if (!response.ok) {
        let errorDescription = "Ocorreu um erro desconhecido ao salvar o plano.";
        let rawText = "";
        try {
          rawText = await response.text(); // Tentar obter o texto bruto primeiro
          const errorData = JSON.parse(rawText); // Tentar parsear como JSON
          if (errorData.error) {
            errorDescription = errorData.error;
          } else {
            console.warn("Resposta da API não contém 'error' mas é JSON válido:", errorData);
          }
        } catch (parseError) {
          console.error("Erro ao parsear JSON da resposta da API, usando texto bruto:", parseError);
          // Se não for JSON, o rawText já contém o que precisamos
          errorDescription = `Erro de comunicação: ${response.statusText || "Resposta inválida"}`; // Fallback
          if (rawText) {
            errorDescription += ` - Detalhes: ${rawText.substring(0, 100)}...`; // Limitar para não poluir
          }
        }

        console.error("Dados de erro da API (depuração - FINAL):", errorDescription);
        console.error("Resposta da API (texto bruto - FINAL):", rawText);

        toast({
          title: "Erro",
          description: errorDescription,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: plano ? "Plano atualizado" : "Plano adicionado",
        description: plano
          ? `O plano ${nome} foi atualizado com sucesso.`
          : `O plano ${nome} foi adicionado com sucesso.`,
      })

      setNome("")
      setValor("")
      setDuracaoDias("30")
      router.refresh()
    } catch (error) {
      console.error("Erro no handleSubmit do PlanosForm (fallback do catch - FINAL):", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
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

  const formatarDuracao = (duracao: string) => {
    // Remove tudo que não for número
    duracao = duracao.replace(/\D/g, "")
    
    // Limita a valores razoáveis (1-365 dias)
    const numero = Number.parseInt(duracao)
    if (numero > 365) {
      duracao = "365"
    } else if (numero < 1 && duracao !== "") {
      duracao = "1"
    }
    
    return duracao
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

      <div className="space-y-2">
        <Label htmlFor="duracaoDias">Duração (dias)</Label>
        <Input
          id="duracaoDias"
          placeholder="Ex: 30"
          type="number"
          min="1"
          max="365"
          value={duracaoDias}
          onChange={(e) => setDuracaoDias(formatarDuracao(e.target.value))}
          required
        />
        <p className="text-sm text-muted-foreground">
          Número de dias que o plano permanece ativo após a ativação/renovação
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Salvando..." : plano ? "Atualizar Plano" : "Adicionar Plano"}
      </Button>
    </form>
  )
}
