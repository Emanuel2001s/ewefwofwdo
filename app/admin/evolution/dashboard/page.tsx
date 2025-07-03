"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  Smartphone, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface DashboardStats {
  instancias: {
    total: number
    conectadas: number
    desconectadas: number
    com_erro: number
  }
  templates: {
    total: number
    ativos: number
  }
  mensagens: {
    hoje: number
    enviadas_hoje: number
    erro_hoje: number
    total_mensal: number
  }
  clientes: {
    total: number
    vencendo_hoje: number
    vencendo_proximos_7_dias: number
  }
}

interface ExecucaoHistorico {
  id: number
    data: string
  clientes_processados: number
  mensagens_enviadas: number
  status: 'sucesso' | 'erro'
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    instancias: { total: 0, conectadas: 0, desconectadas: 0, com_erro: 0 },
    templates: { total: 0, ativos: 0 },
    mensagens: { hoje: 0, enviadas_hoje: 0, erro_hoje: 0, total_mensal: 0 },
    clientes: { total: 0, vencendo_hoje: 0, vencendo_proximos_7_dias: 0 }
  })
  const [execucoes, setExecucoes] = useState<ExecucaoHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [executingNotifications, setExecutingNotifications] = useState(false)

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Carregar estatísticas
      const statsResponse = await fetch('/api/evolution/dashboard/stats')
      const statsData = await statsResponse.json()
      
      if (statsData.success) {
        setStats(statsData.stats)
      }

      // Carregar histórico de execuções
      const execucoesResponse = await fetch('/api/cron/whatsapp-notifications')
      const execucoesData = await execucoesResponse.json()
      
      if (execucoesData.success && execucoesData.historico) {
        setExecucoes(execucoesData.historico.slice(0, 5)) // Últimas 5 execuções
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const executeNotifications = async () => {
    try {
      setExecutingNotifications(true)
      
      const response = await fetch('/api/cron/whatsapp-notifications', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Sucesso",
          description: `Notificações executadas! ${data.clientes_processados} clientes processados, ${data.mensagens_enviadas} mensagens enviadas.`
        })
        
        // Recarregar dados
        loadDashboardData()
      } else {
        throw new Error(data.error)
      }
      
    } catch (error) {
      console.error('Erro ao executar notificações:', error)
      toast({
        title: "Erro",
        description: "Erro ao executar notificações automáticas",
        variant: "destructive"
      })
    } finally {
      setExecutingNotifications(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header Mobile-First */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl lg:text-3xl">
              Dashboard WhatsApp
            </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Monitore o sistema Evolution API em tempo real
            </p>
          </div>
            <div className="flex flex-col gap-2 sm:flex-row">
            <Button
                onClick={loadDashboardData}
                disabled={loading}
                size="sm"
              variant="outline"
                className="w-full sm:w-auto"
            >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={executeNotifications}
                disabled={executingNotifications}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
            >
                <MessageCircle className={`mr-2 h-4 w-4 ${executingNotifications ? 'animate-pulse' : ''}`} />
                {executingNotifications ? 'Executando...' : 'Executar Notificações'}
            </Button>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas de Instâncias */}
        <div className="mb-6 sm:mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white sm:mb-4 sm:text-xl">
            Instâncias WhatsApp
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:gap-6">
            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-blue-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Total</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.instancias.total}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Instâncias</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-green-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Conectadas</CardTitle>
              </div>
            </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.instancias.conectadas}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Online</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-gray-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Desconectadas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.instancias.desconectadas}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Offline</p>
            </CardContent>
          </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-red-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Com Erro</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.instancias.com_erro}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Erro</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cards de Mensagens e Templates */}
        <div className="mb-6 sm:mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white sm:mb-4 sm:text-xl">
            Mensagens e Templates
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-6">
            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-purple-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Templates</CardTitle>
              </div>
            </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.templates.total}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-indigo-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Hoje</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.mensagens.hoje}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Mensagens</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-green-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Enviadas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.mensagens.enviadas_hoje}
              </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Sucesso</p>
            </CardContent>
          </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-red-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Erros</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.mensagens.erro_hoje}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Falhas</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-yellow-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Mensal</CardTitle>
              </div>
            </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.mensagens.total_mensal}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cards de Clientes */}
        <div className="mb-6 sm:mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white sm:mb-4 sm:text-xl">
            Clientes para Notificação
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-6">
            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-blue-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Total Clientes</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.clientes.total}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Cadastrados</p>
            </CardContent>
          </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-red-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Vencendo Hoje</CardTitle>
              </div>
            </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.clientes.vencendo_hoje}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Urgente</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="bg-orange-600 p-2 text-white sm:p-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <CardTitle className="text-xs font-semibold sm:text-sm">Próximos 7 Dias</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {stats.clientes.vencendo_proximos_7_dias}
              </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Em breve</p>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Histórico de Execuções */}
        <Card className="border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader className="bg-gray-600 p-3 text-white sm:p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <CardTitle className="text-sm font-semibold sm:text-base">
                Últimas Execuções Automáticas
            </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {execucoes.length === 0 ? (
              <div className="p-6 text-center">
                <Clock className="mx-auto h-8 w-8 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Nenhuma execução registrada
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  As execuções automáticas aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
                {execucoes.map((execucao) => (
                  <div key={execucao.id} className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {execucao.status === 'sucesso' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(execucao.data).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(execucao.data).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {execucao.clientes_processados} clientes • {execucao.mensagens_enviadas} mensagens
                          </p>
                        </div>
                      </div>
                      <Badge 
                        className={execucao.status === 'sucesso' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-red-100 text-red-800 border-red-200'
                        }
                      >
                        {execucao.status === 'sucesso' ? 'Sucesso' : 'Erro'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 