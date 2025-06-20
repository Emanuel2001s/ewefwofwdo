"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Package, Users, Calendar, Edit, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"

interface Plano {
  id: number
  nome: string
  valor: number
  duracao_dias: number
  clientes_ativos: number
}

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const fetchPlanos = async () => {
    try {
      const response = await fetch('/api/planos')
      if (response.ok) {
        const data = await response.json()
        // Transformar dados da API para incluir contagem de clientes
        const planosComContagem = await Promise.all(
          data.data.map(async (plano: any) => {
            try {
              const clientesResponse = await fetch(`/api/clientes?plano_id=${plano.id}`)
              const clientesData = await clientesResponse.json()
              return {
                ...plano,
                clientes_ativos: clientesData.data?.length || 0
              }
            } catch {
              return { ...plano, clientes_ativos: 0 }
            }
          })
        )
        setPlanos(planosComContagem)
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar planos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlanos()
  }, [])

  const handleDelete = async (id: number) => {
    setIsDeleting(id)
    try {
      const response = await fetch(`/api/planos/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao excluir plano")
      }

      toast({
        title: "Plano excluído",
        description: "O plano foi excluído com sucesso.",
      })

      // Recarregar planos
      fetchPlanos()
    } catch (error) {
      toast({
        title: "Falha ao Excluir Plano",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir o plano.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const formatarValor = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header com botão */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
        <Button className="bg-blue-600 hover:bg-blue-700" asChild>
          <Link href="/admin/planos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano
          </Link>
        </Button>
      </div>

      {/* Grid de cards dos planos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {planos.map((plano) => (
          <Card key={plano.id} className="hover:shadow-lg transition-shadow max-w-sm">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                {plano.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-blue-600 mx-auto mb-1 font-bold text-lg">R$</div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatarValor(plano.valor)}
                  </div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                </div>
                
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-green-600">
                    {plano.clientes_ativos}
                  </div>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </div>
              </div>
              
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                <div className="text-sm font-semibold text-gray-700">
                  {formatarDuracao(plano.duracao_dias)}
                </div>
                <p className="text-xs text-muted-foreground">Duração</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                  <Link href={`/admin/planos/${plano.id}/editar`}>
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Link>
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs text-red-600 hover:text-red-700"
                      disabled={isDeleting === plano.id}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      {isDeleting === plano.id ? "Excluindo..." : "Excluir"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o plano "{plano.nome}"? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDelete(plano.id)}
                        disabled={isDeleting === plano.id}
                      >
                        {isDeleting === plano.id ? "Excluindo..." : "Excluir"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {planos.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum plano cadastrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
