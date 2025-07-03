"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Send, Clock, CheckCircle, XCircle, Users, MessageCircle, TrendingUp, Play, Pause, Trash2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface CampanhaResumo {
  id: number
  nome: string
  status: string
  total_clientes: number
  enviados: number
  sucessos: number
  falhas: number
  data_criacao: string
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

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      // Carregar campanhas recentes
      const resCampanhas = await fetch('/api/envio-massa')
      const campanhasData = await resCampanhas.json()
      setCampanhas(campanhasData.campanhas || [])

      // Carregar estatísticas
      const resStats = await fetch('/api/envio-massa/estatisticas')
      const statsData = await resStats.json()
      setEstatisticas(statsData || {
        total_campanhas: 0,
        campanhas_ativas: 0,
        mensagens_enviadas_hoje: 0,
        taxa_sucesso_media: 0
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

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
        carregarDados() // Recarregar dados
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
        carregarDados()
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
        carregarDados()
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
    }
  }

  const excluirCampanha = async (campanhaId: number) => {
    try {
      const response = await fetch(`/api/envio-massa/${campanhaId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Campanha Excluída",
          description: "A campanha foi excluída com sucesso",
        })
        carregarDados()
      } else {
        throw new Error('Erro ao excluir campanha')
      }
    } catch (error) {
      console.error('Erro ao excluir campanha:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir campanha",
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
    <div className="space-y-6 md:space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Envio em Massa</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Gerencie campanhas de WhatsApp para seus clientes
          </p>
        </div>
        
        <Button onClick={() => router.push("/admin/envio-massa/nova-campanha")}>
          <Plus className="h-5 w-5 mr-3" />
          Nova Campanha
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total de Campanhas</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {estatisticas.total_campanhas}
                </p>
              </div>
              <div className="p-4 bg-blue-500 rounded-full">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Campanhas Ativas</p>
                <p className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100">
                  {estatisticas.campanhas_ativas}
                </p>
              </div>
              <div className="p-4 bg-green-500 rounded-full">
                <Send className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Enviadas Hoje</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {estatisticas.mensagens_enviadas_hoje}
                </p>
              </div>
              <div className="p-4 bg-purple-500 rounded-full">
                <Users className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Taxa de Sucesso</p>
                <p className="text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {estatisticas.taxa_sucesso_media}%
                </p>
              </div>
              <div className="p-4 bg-orange-500 rounded-full">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Campanhas Recentes */}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">Campanhas Recentes</CardTitle>
          <CardDescription className="text-base">
            Últimas campanhas de envio em massa criadas
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {campanhas.length === 0 ? (
            <div className="text-center py-16 space-y-6">
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto" />
              <div className="space-y-4">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Nenhuma campanha criada
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">
                  Comece criando sua primeira campanha de envio em massa
                </p>
              </div>
              <Button onClick={() => router.push("/admin/envio-massa/nova-campanha")}>
                Criar Nova Campanha
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {campanhas.map((campanha) => (
                <div key={campanha.id} className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <h4 className="font-medium text-gray-900 dark:text-white text-lg">
                        {campanha.nome}
                      </h4>
                      {getStatusBadge(campanha.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <span>{campanha.total_clientes} clientes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        <span>{campanha.enviados} enviados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{campanha.sucessos} sucessos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span>{campanha.falhas} falhas</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-6">
                    <div className="text-right space-y-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(campanha.data_criacao).toLocaleDateString('pt-BR')}
                      </p>
                      {campanha.enviados > 0 && (
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          {calcularTaxaSucesso(campanha.sucessos, campanha.enviados)}% sucesso
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Botões de controle baseados no status */}
                      {campanha.status === 'rascunho' && (
                        <Button 
                          size="sm"
                          onClick={() => iniciarCampanha(campanha.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Iniciar
                        </Button>
                      )}
                      
                      {campanha.status === 'enviando' && (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => pausarCampanha(campanha.id)}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pausar
                        </Button>
                      )}
                      
                      {campanha.status === 'pausada' && (
                        <Button 
                          size="sm"
                          onClick={() => retomarCampanha(campanha.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Retomar
                        </Button>
                      )}
                      
                      <Button variant="outline" size="sm" className="px-4 py-2" onClick={() => router.push(`/admin/envio-massa/${campanha.id}`)}>
                        Ver Detalhes
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-3 w-3 mr-1" />
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
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 