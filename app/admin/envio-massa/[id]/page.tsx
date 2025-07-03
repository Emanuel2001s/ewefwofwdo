"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { ResponsiveTable } from "@/components/ui/responsive-table"

interface Envio {
  id: number
  cliente_nome: string
  cliente_telefone: string
  status: string
  mensagem_enviada: string
  erro_detalhes: string | null
  data_envio: string
  data_entrega: string | null
  data_leitura: string | null
  tentativas: number
}

interface Campanha {
  id: number
  nome: string
  status: string
  template_nome: string
  template_conteudo: string
  instancia_nome: string
  instancia_status: string
  total_clientes: number
  enviados: number
  sucessos: number
  falhas: number
  data_criacao: string
  data_inicio: string | null
  data_conclusao: string | null
}

export default function DetalheCampanha({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [campanha, setCampanha] = useState<Campanha | null>(null)
  const [envios, setEnvios] = useState<Envio[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const columns = [
    {
      key: "cliente_nome",
      label: "Cliente",
    },
    {
      key: "cliente_telefone",
      label: "Telefone",
    },
    {
      key: "status",
      label: "Status",
    },
    {
      key: "data_envio",
      label: "Data Envio",
      render: (item: Envio) => {
        const data = new Date(item.data_envio)
        return data.toLocaleString()
      },
    },
    {
      key: "tentativas",
      label: "Tentativas",
    },
  ]

  useEffect(() => {
    carregarDetalhes()
  }, [params.id])

  async function carregarDetalhes() {
    try {
      const response = await fetch(`/api/envio-massa/${params.id}`)
      if (!response.ok) throw new Error("Erro ao carregar detalhes")
      const data = await response.json()
      setCampanha(data.campanha)
      setEnvios(data.envios)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da campanha",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function excluirCampanha() {
    try {
      const response = await fetch(`/api/envio-massa/${params.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao excluir campanha")
      }

      toast({
        title: "Sucesso",
        description: "Campanha excluída com sucesso",
      })

      router.push("/admin/envio-massa")
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir campanha",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>
  }

  if (!campanha) {
    return <div className="p-8">Campanha não encontrada</div>
  }

  const totalPages = Math.ceil(envios.length / pageSize)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Detalhes da Campanha</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/envio-massa")}
          >
            Voltar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Excluir Campanha</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Campanha</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={excluirCampanha}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Informações da Campanha</h2>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Nome</dt>
              <dd>{campanha.nome}</dd>
            </div>
            <div>
              <dt className="font-medium">Status</dt>
              <dd>{campanha.status}</dd>
            </div>
            <div>
              <dt className="font-medium">Template</dt>
              <dd>{campanha.template_nome}</dd>
            </div>
            <div>
              <dt className="font-medium">Instância WhatsApp</dt>
              <dd>{campanha.instancia_nome} ({campanha.instancia_status})</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Estatísticas</h2>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">Total de Clientes</dt>
              <dd>{campanha.total_clientes}</dd>
            </div>
            <div>
              <dt className="font-medium">Mensagens Enviadas</dt>
              <dd>{campanha.enviados}</dd>
            </div>
            <div>
              <dt className="font-medium">Sucessos</dt>
              <dd>{campanha.sucessos}</dd>
            </div>
            <div>
              <dt className="font-medium">Falhas</dt>
              <dd>{campanha.falhas}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Histórico de Envios</h2>
        <ResponsiveTable
          data={envios}
          columns={columns}
          loading={loading}
          emptyMessage="Nenhum envio encontrado"
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      </Card>
    </div>
  )
} 