"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Server, Users, Activity, Edit, Trash2 } from "lucide-react"
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

interface Servidor {
  id: number
  nome: string
  clientes_ativos: number
}

export default function ServidoresPage() {
  const [servidores, setServidores] = useState<Servidor[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const fetchServidores = async () => {
    try {
      const response = await fetch('/api/servidores')
      if (response.ok) {
        const data = await response.json()
        // Transformar dados da API para incluir contagem de clientes
        const servidoresComContagem = await Promise.all(
          data.data.map(async (servidor: any) => {
            try {
              const clientesResponse = await fetch(`/api/clientes?servidor_id=${servidor.id}`)
              const clientesData = await clientesResponse.json()
              return {
                ...servidor,
                clientes_ativos: clientesData.data?.length || 0
              }
            } catch {
              return { ...servidor, clientes_ativos: 0 }
            }
          })
        )
        setServidores(servidoresComContagem)
      }
    } catch (error) {
      console.error('Erro ao carregar servidores:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar servidores",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServidores()
  }, [])

  const handleDelete = async (id: number) => {
    setIsDeleting(id)
    try {
      const response = await fetch(`/api/servidores/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao excluir servidor")
      }

      toast({
        title: "Servidor excluído",
        description: "O servidor foi excluído com sucesso.",
      })

      // Recarregar servidores
      fetchServidores()
    } catch (error) {
      toast({
        title: "Falha ao Excluir Servidor",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir o servidor.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Servidores</h1>
        <Button className="bg-blue-600 hover:bg-blue-700" asChild>
          <Link href="/admin/servidores/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Servidor
          </Link>
        </Button>
      </div>

      {/* Grid de cards dos servidores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {servidores.map((servidor) => (
          <Card key={servidor.id} className="hover:shadow-lg transition-shadow max-w-sm">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5" />
                {servidor.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-green-600">
                    {servidor.clientes_ativos}
                  </div>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </div>
                
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-blue-600">
                    Online
                  </div>
                  <p className="text-xs text-muted-foreground">Status</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                  <Link href={`/admin/servidores/${servidor.id}/editar`}>
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
                      disabled={isDeleting === servidor.id}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      {isDeleting === servidor.id ? "Excluindo..." : "Excluir"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o servidor "{servidor.nome}"? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDelete(servidor.id)}
                        disabled={isDeleting === servidor.id}
                      >
                        {isDeleting === servidor.id ? "Excluindo..." : "Excluir"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {servidores.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum servidor cadastrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
