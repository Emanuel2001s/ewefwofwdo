"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Send, Clock, CheckCircle, XCircle, Users, MessageCircle, TrendingUp, Play, Pause, Trash2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface CampanhaResumo {
  id: number
  nome: string
  status: 'rascunho' | 'agendada' | 'enviando' | 'pausada' | 'concluida' | 'cancelada' | 'erro'
  total_clientes: number
  enviados: number
  sucessos: number
  falhas: number
  data_criacao: string
  template_nome: string
  instancia_nome: string
  data_inicio: string | null
  data_agendamento: string | null
  data_conclusao: string | null
  template_id: number
  instancia_id: number
  filtro_clientes: string
  intervalo_segundos: number
  descricao: string | null
}

interface Estatisticas {
  total_campanhas: number
  campanhas_ativas: number
  mensagens_enviadas_hoje: number
  taxa_sucesso_media: number
}

export default function EnvioMassaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [campanhas, setCampanhas] = useState<CampanhaResumo[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    total_campanhas: 0,
    campanhas_ativas: 0,
    mensagens_enviadas_hoje: 0,
    taxa_sucesso_media: 0
  })
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [intervaloAtualizacao, setIntervaloAtualizacao] = useState(30000) // 30 segundos padrão

  const carregarDados = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setAtualizando(true)
    }
    
    try {
      const [resCampanhas, resStats] = await Promise.all([
        fetch('/api/envio-massa'),
        fetch('/api/envio-massa/estatisticas')
      ])

      const [campanhasData, statsData] = await Promise.all([
        resCampanhas.json(),
        resStats.json()
      ])

      if (!campanhasData.success) {
        throw new Error(campanhasData.error || 'Erro ao carregar campanhas')
      }

      if (!statsData.success) {
        throw new Error(statsData.error || 'Erro ao carregar estatísticas')
      }

      setCampanhas(campanhasData.data || [])
      setEstatisticas({
        total_campanhas: statsData.data?.total_campanhas || 0,
        campanhas_ativas: statsData.data?.campanhas_ativas || 0,
        mensagens_enviadas_hoje: statsData.data?.mensagens_enviadas_hoje || 0,
        taxa_sucesso_media: statsData.data?.taxa_sucesso_media || 0
      })

      // Ajusta o intervalo baseado na existência de campanhas ativas
      const temCampanhasAtivas = campanhasData.data?.some(
        (campanha: CampanhaResumo) => campanha.status === 'enviando'
      )
      setIntervaloAtualizacao(temCampanhasAtivas ? 10000 : 30000) // 10s se tiver ativas, 30s se não

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      if (!silencioso) {
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Erro ao carregar dados",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
      setAtualizando(false)
    }
  }, [toast])

  useEffect(() => {
    carregarDados()
    
    let intervalId: NodeJS.Timeout

    const iniciarAtualizacao = () => {
      intervalId = setInterval(() => {
        carregarDados(true) // Atualização silenciosa
      }, intervaloAtualizacao)
    }

    iniciarAtualizacao()

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [carregarDados, intervaloAtualizacao])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'rascunho': { color: 'bg-gray-100 text-gray-800', text: 'Rascunho' },
      'agendada': { color: 'bg-blue-100 text-blue-800', text: 'Agendada' },
      'enviando': { color: 'bg-yellow-100 text-yellow-800', text: 'Enviando' },
      'concluida': { color: 'bg-green-100 text-green-800', text: 'Concluída' },
      'cancelada': { color: 'bg-red-100 text-red-800', text: 'Cancelada' },
      'erro': { color: 'bg-red-100 text-red-800', text: 'Erro' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.rascunho
    
    return (
      <Badge className={`${config.color} border-0`}>
        {config.text}
      </Badge>
    )
  }

  const calcularTaxaSucesso = (sucessos: number, enviados: number) => {
    if (enviados === 0) return 0
    return Math.round((sucessos / enviados) * 100)
  }

  const iniciarCampanha = async (campanhaId: number) => {
    try {
      const response = await fetch(`/api/envio-massa/${campanhaId}/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Campanha Iniciada!",
          description: `Envio iniciado para ${data.total_clientes} cliente(s)`,
        })
        await carregarDados() // Aguardar o carregamento dos dados
        router.refresh() // Forçar atualização da página
      } else {
        throw new Error(data.error || 'Erro ao iniciar campanha')
      }
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error)
      toast({
        title: "Erro",
        description: "Erro ao iniciar campanha",
        variant: "destructive"
      })
      router.refresh() // Atualizar mesmo em caso de erro
    }
  }

  const pausarCampanha = async (campanhaId: number) => {
    try {
      const response = await fetch(`/api/envio-massa/${campanhaId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'pausar' })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Campanha Pausada",
          description: "A campanha foi pausada com sucesso",
        })
        await carregarDados()
        router.refresh()
      } else {
        throw new Error(data.error || 'Erro ao pausar campanha')
      }
    } catch (error) {
      console.error('Erro ao pausar campanha:', error)
      toast({
        title: "Erro",
        description: "Erro ao pausar campanha",
        variant: "destructive"
      })
      router.refresh()
    }
  }

  const retomarCampanha = async (campanhaId: number) => {
    try {
      const response = await fetch(`/api/envio-massa/${campanhaId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'retomar' })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Campanha Retomada",
          description: "A campanha foi retomada com sucesso",
        })
        await carregarDados()
        router.refresh()
      } else {
        throw new Error(data.error || 'Erro ao retomar campanha')
      }
    } catch (error) {
      console.error('Erro ao retomar campanha:', error)
      toast({
        title: "Erro",
        description: "Erro ao retomar campanha",
        variant: "destructive"
      })
      router.refresh()
    }
  }

  const excluirCampanha = async (campanhaId: number) => {
    try {
      const response = await fetch(`/api/envio-massa/${campanhaId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Campanha Excluída",
          description: data.message || "A campanha foi excluída com sucesso",
        })
        await carregarDados()
      } else {
        // Tratar casos específicos
        if (response.status === 400 && data.error?.includes('em andamento')) {
          toast({
            title: "Campanha não pode ser excluída",
            description: "Não é possível excluir uma campanha que está sendo enviada. Pause-a primeiro.",
            variant: "destructive"
          })
        } else if (response.status === 404) {
          toast({
            title: "Campanha não encontrada",
            description: "A campanha não foi encontrada ou já foi excluída.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Erro ao Excluir Campanha",
            description: data.error || "Erro interno do servidor",
            variant: "destructive"
          })
        }
      }
    } catch (error: any) {
      console.error('Erro ao excluir campanha:', error)
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar com o servidor. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 p-4 md:p-6">
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Envio em Massa</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Gerencie campanhas de WhatsApp para seus clientes
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-8">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl font-bold">Envio em Massa</h1>
          <p className="text-xs md:text-sm text-gray-400">Gerencie campanhas de WhatsApp para seus clientes</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={() => carregarDados()}
            disabled={atualizando}
          >
            <RefreshCw className={`w-4 h-4 ${atualizando ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/admin/envio-massa/nova-campanha">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Campanha
            </Button>
          </Link>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{estatisticas.total_campanhas}</div>
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Campanhas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{estatisticas.campanhas_ativas}</div>
              <Send className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Enviadas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{estatisticas.mensagens_enviadas_hoje}</div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {typeof estatisticas.taxa_sucesso_media === 'number' 
                  ? estatisticas.taxa_sucesso_media.toFixed(1) 
                  : '0.0'}%
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campanhas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas Recentes</CardTitle>
          <CardDescription>Últimas campanhas de envio em massa criadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campanhas.map((campanha) => (
              <div key={campanha.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <h3 className="font-medium">{campanha.nome}</h3>
                      {getStatusBadge(campanha.status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Template: {campanha.template_nome} | Instância: {campanha.instancia_nome}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm mt-2">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {campanha.total_clientes} clientes
                      </span>
                      <span className="flex items-center gap-1">
                        <Send className="w-4 h-4" />
                        {campanha.enviados} enviados
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {campanha.sucessos} sucessos
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        {campanha.falhas} falhas
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto justify-end">
                    {campanha.status === 'rascunho' && (
                      <Button size="sm" className="w-full sm:w-auto" onClick={() => iniciarCampanha(campanha.id)}>
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    {campanha.status === 'enviando' && (
                      <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => pausarCampanha(campanha.id)}>
                        <Pause className="w-4 h-4 mr-1" />
                        Pausar
                      </Button>
                    )}
                    <Link href={`/admin/envio-massa/${campanha.id}`} className="w-full sm:w-auto">
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">Detalhes</Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="w-full sm:w-auto">
                          <Trash2 className="w-4 h-4 mr-1" />
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
                          <AlertDialogAction onClick={() => excluirCampanha(campanha.id)}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
            {campanhas.length === 0 && (
              <div className="text-center text-gray-500 py-8">Nenhuma campanha encontrada.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 