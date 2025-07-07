"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { ResponsiveTable } from "@/components/ui/responsive-table"
import { Badge } from "@/components/ui/badge"
import { Play, Trash2 } from "lucide-react"

interface Envio {
  id: number
  status: string
  data_envio: string | null
  erro: string | null
  whatsapp: string
  cliente_nome: string | null
  mensagem_enviada: string | null
  tentativas: number
  enviado_em: string | null
  entregue_em: string | null
  lido_em: string | null
  message_id: string | null
}

interface Campanha {
  id: number
  nome: string
  template_id: number
  instancia_id: number
  status: string
  total_clientes: number
  enviados: number
  sucessos: number
  falhas: number
  data_criacao: string
  data_inicio: string | null
  data_conclusao: string | null
  template_nome: string
  template_conteudo: string
  instancia_nome: string
  instancia_status: string
  descricao: string | null
}

export default function DetalheCampanha() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [campanha, setCampanha] = useState<Campanha | null>(null)
  const [envios, setEnvios] = useState<Envio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(envios.length / pageSize)
  const paginatedData = envios.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const columns = [
    {
      key: "cliente_nome",
      label: "Cliente",
      render: (item: Envio) => item.cliente_nome || "Nome não disponível"
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      render: (item: Envio) => item.whatsapp
    },
    {
      key: "status",
      label: "Status",
      render: (item: Envio) => (
        <Badge className={
          item.status === "enviado" || item.status === "entregue" || item.status === "lido" ? "bg-green-100 text-green-800" :
          item.status === "erro" ? "bg-red-100 text-red-800" :
          item.status === "pendente" ? "bg-yellow-100 text-yellow-800" :
          "bg-gray-100 text-gray-800"
        }>
          {item.status}
        </Badge>
      )
    },
    {
      key: "data_envio",
      label: "Data/Hora Envio",
      render: (item: Envio) => formatarData(item.data_envio)
    },
    {
      key: "tentativas",
      label: "Tentativas",
      render: (item: Envio) => item.tentativas
    }
  ]

  useEffect(() => {
    if (!params.id) {
      setError("ID da campanha não fornecido")
      setLoading(false)
      return
    }
    carregarDetalhes()

    // Atualizar status a cada 5 segundos se a campanha estiver em andamento
    let interval: NodeJS.Timeout | null = null
    if (campanha?.status === 'enviando') {
      interval = setInterval(async () => {
        const response = await fetch(`/api/envio-massa/${params.id}`)
        const data = await response.json()
        
        if (response.ok && data.campanha) {
          setCampanha(data.campanha)
          setEnvios(data.envios || [])
          
          // Se a campanha foi concluída ou teve erro, recarregar a página
          if (data.campanha.status === 'concluida' || data.campanha.status === 'erro') {
            clearInterval(interval!)
            router.refresh()
          }
        }
      }, 5000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [params.id, campanha?.status])

  // Resetar a página atual quando os dados mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [envios])

  async function carregarDetalhes() {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 [DEBUG Frontend] ID da campanha: "${params.id}"`)
      const response = await fetch(`/api/envio-massa/${params.id}`)
      console.log(`🔍 [DEBUG Frontend] Response status: ${response.status}`)
      
      const data = await response.json()
      console.log(`🔍 [DEBUG Frontend] Resposta da API:`, data)

      if (!response.ok) {
        console.error(`❌ [DEBUG Frontend] Erro da API:`, data)
        throw new Error(data.error || "Erro ao carregar detalhes")
      }

      if (!data.campanha) {
        throw new Error("Dados da campanha não encontrados na resposta")
      }

      setCampanha(data.campanha)
      setEnvios(data.envios || [])
    } catch (error) {
      console.error(`❌ [DEBUG Frontend] Erro:`, error)
      setError(error instanceof Error ? error.message : "Erro ao carregar detalhes da campanha")
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar os detalhes da campanha",
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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir campanha")
      }

      toast({
        title: "Sucesso",
        description: "Campanha excluída com sucesso",
      })

      router.push("/admin/envio-massa")
    } catch (error) {
      console.error("Erro ao excluir campanha:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir campanha",
        variant: "destructive",
      })
    }
  }

  async function iniciarCampanha() {
    try {
      const response = await fetch(`/api/envio-massa/${params.id}/iniciar`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao iniciar campanha")
      }

      toast({
        title: "Sucesso",
        description: "Campanha iniciada com sucesso",
      })

      // Recarregar a página após iniciar a campanha
      router.refresh()
    } catch (error) {
      console.error("Erro ao iniciar campanha:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao iniciar campanha",
        variant: "destructive",
      })
      // Recarregar a página em caso de erro
      router.refresh()
    }
  }

  async function processarEnvios() {
    try {
      const response = await fetch(`/api/cron/processar-envios`, {
        headers: {
          'x-cron-secret': process.env.NEXT_PUBLIC_CRON_SECRET || ''
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar envios")
      }

      toast({
        title: "Sucesso",
        description: "Processamento de envios iniciado",
      })

      carregarDetalhes()
    } catch (error) {
      console.error("Erro ao processar envios:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar envios",
        variant: "destructive",
      })
    }
  }

  const formatarData = (data: string | null) => {
    if (!data) return "-"
    const date = new Date(data)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!campanha) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          Não foi possível encontrar os detalhes desta campanha
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{campanha.nome}</h1>
          <p className="text-gray-600">{campanha.descricao || "Sem descrição"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => router.push("/admin/envio-massa")}
            variant="outline"
          >
            Voltar
          </Button>
          {campanha.status === "pendente" && (
            <Button onClick={iniciarCampanha} className="bg-green-600 hover:bg-green-700">
              <Play className="w-4 h-4 mr-2" />
              Iniciar Envios
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
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
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campanha.total_clientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campanha.enviados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sucessos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{campanha.sucessos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Falhas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{campanha.falhas}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Campanha</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="font-semibold">Status</p>
            <Badge className={
              campanha.status === "concluida" ? "bg-green-100 text-green-800" :
              campanha.status === "erro" ? "bg-red-100 text-red-800" :
              campanha.status === "enviando" ? "bg-blue-100 text-blue-800" :
              "bg-gray-100 text-gray-800"
            }>
              {campanha.status}
            </Badge>
          </div>
          <div>
            <p className="font-semibold">Template</p>
            <p>{campanha.template_nome}</p>
          </div>
          <div>
            <p className="font-semibold">Instância</p>
            <p>{campanha.instancia_nome}</p>
          </div>
          <div>
            <p className="font-semibold">Data de Criação</p>
            <p>{formatarData(campanha.data_criacao)}</p>
          </div>
          <div>
            <p className="font-semibold">Data de Início</p>
            <p>{formatarData(campanha.data_inicio)}</p>
          </div>
          <div>
            <p className="font-semibold">Data de Conclusão</p>
            <p>{formatarData(campanha.data_conclusao)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Envios</CardTitle>
          <CardDescription>
            Total de {envios.length} envios realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <ResponsiveTable
              data={paginatedData}
              columns={columns}
              pagination={{
                currentPage,
                totalPages,
                onPageChange: setCurrentPage
              }}
              emptyMessage="Nenhum envio encontrado"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 