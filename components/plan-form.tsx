"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

interface PlanFormProps {
  plan?: { id: number; nome: string; valor: number; duracao_dias?: number } | null;
}

const formSchema = z.object({
  nome: z.string().min(2, { message: "O nome do plano deve ter pelo menos 2 caracteres." }).max(50, { message: "O nome do plano não pode exceder 50 caracteres." }),
  valor: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01, { message: "O valor do plano deve ser um número positivo." })
  ),
  duracao_dias: z.preprocess(
    (val) => Number(val),
    z.number().min(1, { message: "A duração deve ser pelo menos 1 dia." }).max(365, { message: "A duração não pode exceder 365 dias." })
  ),
});

export function PlanForm({ plan = null }: PlanFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: plan?.nome || "",
      valor: plan?.valor || 0.01,
      duracao_dias: plan?.duracao_dias || 30,
    },
  });

  useEffect(() => {
    if (plan) {
      form.reset({
        nome: plan.nome,
        valor: plan.valor,
        duracao_dias: plan.duracao_dias || 30,
      });
    }
  }, [plan, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const url = plan ? `/api/planos/${plan.id}` : "/api/planos";
      const method = plan ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

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
        title: plan ? "Plano atualizado" : "Plano adicionado",
        description: plan
          ? `O plano ${values.nome} foi atualizado com sucesso.`
          : `O plano ${values.nome} foi adicionado com sucesso.`,
      });

      router.push("/admin/planos");
      router.refresh(); // Para revalidar os dados na página de planos
    } catch (error) {
      console.error("Erro no handleSubmit do PlanForm (fallback do catch - FINAL):", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const formatarDuracao = (dias: number) => {
    if (dias === 1) return "1 dia"
    if (dias === 7) return "1 semana"
    if (dias === 30) return "1 mês"
    if (dias === 90) return "3 meses"
    if (dias === 180) return "6 meses"
    if (dias === 365) return "1 ano"
    return `${dias} dias`
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Plano</Label>
        <Input
          id="nome"
          placeholder="Nome do plano (ex: Básico, Premium)"
          {...form.register("nome")}
        />
        {form.formState.errors.nome && (
          <p className="text-sm text-red-500">{form.formState.errors.nome.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="valor">Valor (R$)</Label>
        <Input
          id="valor"
          type="number"
          step="0.01"
          placeholder="Valor do plano (ex: 29.90)"
          {...form.register("valor")}
        />
        {form.formState.errors.valor && (
          <p className="text-sm text-red-500">{form.formState.errors.valor.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="duracao_dias">Duração (dias)</Label>
        <Input
          id="duracao_dias"
          type="number"
          min="1"
          max="365"
          placeholder="Duração em dias (ex: 30)"
          {...form.register("duracao_dias")}
        />
        {form.formState.errors.duracao_dias && (
          <p className="text-sm text-red-500">{form.formState.errors.duracao_dias.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Número de dias que o plano permanece ativo após a ativação/renovação
        </p>
        {form.watch("duracao_dias") && (
          <p className="text-sm text-blue-600">
            Duração: {formatarDuracao(Number(form.watch("duracao_dias")))}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Salvando..." : plan ? "Atualizar Plano" : "Adicionar Plano"}
      </Button>
    </form>
  );
} 