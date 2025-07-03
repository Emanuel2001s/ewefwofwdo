"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  MessageCircle, 
  Smartphone, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  AlertTriangle,
  Search,
  Send,
  BarChart3,
  Trash2
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog'

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
    vencimento_ativos: number
  }
  clientes: {
    total: number
    com_whatsapp: number
    ativos_com_whatsapp: number
  }
  proximos_vencimentos: number
  recent_executions: Array<{
    data: string
    total_mensagens: number
    sucessos: number
    erros: number
    taxa_sucesso: string
  }>
}

interface MessageHistory {
  id: number
  cliente_nome: string
  cliente_whatsapp: string
  instancia_nome: string
  template_nome: string
  message_type: 'texto' | 'imagem'
  status: 'enviando' | 'enviada' | 'erro' | 'lida'
  created_at: string
  error_message?: string
}

export default function WhatsAppPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [messages, setMessages] = useState<MessageHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isClearing, setIsClearing] = useState(false)

  const loadStats = async () => {
    try {
      const response = await fetch('/api/cron/whatsapp-notifications')
      if (!response.ok) throw new Error('Erro ao carregar estatísticas')
      
      const data = await response.json()
      setStats(data.general_stats ? {
        instancias: data.general_stats.instancias,
        templates: data.general_stats.templates,
        clientes: data.general_stats.clientes,
        proximos_vencimentos: data.general_stats.proximos_vencimentos,
        recent_executions: data.recent_executions || []
      } : null)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar estatísticas do WhatsApp",
        variant: "destructive"
      })
    }
  }

  const loadMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('message_type', typeFilter)
      params.append('page', '1')
      params.append('limit', '50')

      const response = await fetch(`/api/evolution/messages/history?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar mensagens')
      
      const data = await response.json()
      setMessages(data.mensagens || [])
      setRefreshKey(prev => prev + 1) // Forçar re-render responsivo
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar histórico de mensagens",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, typeFilter])

  const handleClearHistory = async () => {
    setIsClearing(true)
    try {
      const response = await fetch('/api/evolution/messages/history/clear', {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao limpar histórico')
      }

      toast({
        title: "Sucesso",
        description: "Histórico de mensagens limpo com sucesso."
      })
      
      // Limpa a tabela no frontend e recarrega os dados
      setMessages([])
      loadStats()

    } catch (error) {
      console.error('Erro ao limpar histórico:', error)
      toast({
        title: "Erro",
        description: (error as Error).message,
        variant: "destructive"
      })
    } finally {
      setIsClearing(false)
    }
  }

  const executeNotifications = async () => {
    setExecuting(true)
    try {
      const response = await fetch('/api/cron/whatsapp-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message
        })
        await loadStats()
        await loadMessages()
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao executar notificações",
        variant: "destructive"
      })
    } finally {
      setExecuting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviada':
      case 'lida':
        return <Badge className="bg-green-100 text-green-800">Enviada</Badge>
      case 'enviando':
        return <Badge className="bg-yellow-100 text-yellow-800">Enviando</Badge>
      case 'erro':
        return <Badge className="bg-red-100 text-red-800">Erro</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enviada':
      case 'lida':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'enviando':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  useEffect(() => {
    loadStats()
    loadMessages()
    const interval = setInterval(() => {
      loadStats()
      loadMessages()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 w-full min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              WhatsApp API
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => { loadStats(); loadMessages(); }}
              variant="outline"
              size="lg"
              disabled={loading}
              className="bg-white/80 hover:bg-white/90 border-green-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <Link href="/admin/templates">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Link>
            </Button>
            <Button
              onClick={executeNotifications}
              size="lg"
              disabled={executing}
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Send className={`h-4 w-4 mr-2 ${executing ? 'animate-pulse' : ''}`} />
              {executing ? 'Enviando...' : 'Executar Notificações'}
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 w-full">
          {/* Instâncias */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-green-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <Smartphone className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-semibold">Instâncias</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.instancias.total || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">Conectadas</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {stats?.instancias.conectadas || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600">Desconectadas</span>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {stats?.instancias.desconectadas || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-blue-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <FileText className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-semibold">Templates</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.templates.total || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Ativos</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {stats?.templates.ativos || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-600">Vencimento</span>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    {stats?.templates.vencimento_ativos || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clientes */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-purple-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-semibold">Clientes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.clientes.total || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-600">Com WhatsApp</span>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    {stats?.clientes.com_whatsapp || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">Ativos c/ WhatsApp</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {stats?.clientes.ativos_com_whatsapp || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Próximos Vencimentos */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-orange-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-semibold">Vencimentos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {stats?.proximos_vencimentos || 0}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Próximos 3 dias
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Clientes que receberão notificação automática
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Mensagens */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-green-600 text-white flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6" />
              <CardTitle>Histórico de Mensagens WhatsApp</CardTitle>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-lg">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Histórico
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente todo o histórico de mensagens do banco de dados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearHistory}
                    disabled={isClearing}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isClearing ? 'Limpando...' : 'Sim, limpar tudo'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="enviada">Enviadas</SelectItem>
                  <SelectItem value="enviando">Enviando</SelectItem>
                  <SelectItem value="erro">Com erro</SelectItem>
                  <SelectItem value="lida">Lidas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="texto">Texto</SelectItem>
                  <SelectItem value="imagem">Imagem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabela/Cards Responsivos */}
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma mensagem encontrada
              </div>
            ) : (
              <>
                {/* Tabela Desktop */}
                <div key={`desktop-table-${refreshKey}`} className="hidden md:block w-full overflow-x-auto">
                  <Table className="w-full min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Instância</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((message) => (
                        <TableRow key={`desktop-${message.id}`}>
                          <TableCell className="font-medium">
                            {message.cliente_nome}
                          </TableCell>
                          <TableCell>{message.cliente_whatsapp}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {message.template_nome}
                              {message.error_message && (
                                <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                                  Erro
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {message.message_type === 'imagem' ? 'Imagem' : 'Texto'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(message.status)}
                              {getStatusBadge(message.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(message.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {message.instancia_nome}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Cards Mobile */}
                <div key={`mobile-cards-${refreshKey}`} className="md:hidden w-full space-y-4 flex-1 min-w-0">
                  {messages.map((message) => (
                    <Card key={`mobile-${message.id}-${refreshKey}`} className="shadow-md border border-gray-200 bg-white w-full shrink-0">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {message.cliente_nome}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                              {message.cliente_whatsapp}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {getStatusIcon(message.status)}
                            {getStatusBadge(message.status)}
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Template:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-right break-words">
                                {message.template_nome}
                              </span>
                              {message.error_message && (
                                <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                                  Erro
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Tipo:</span>
                            <Badge variant="outline" className="text-xs">
                              {message.message_type === 'imagem' ? 'Imagem' : 'Texto'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Instância:</span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                              {message.instancia_nome}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Data/Hora:</span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Execuções Recentes */}
        {stats?.recent_executions && stats.recent_executions.length > 0 && (
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="bg-blue-600 text-white">
              <CardTitle className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5" />
                Execuções Recentes (Últimos 7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {stats.recent_executions.map((execution, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {new Date(execution.data).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {execution.taxa_sucesso}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">{execution.total_mensagens}</span> mensagens enviadas
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className="text-green-600">✓ {execution.sucessos} sucessos</span>
                          <span className="text-red-600">✗ {execution.erros} erros</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={execution.erros === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {execution.erros === 0 ? 'Perfeito' : 'Com problemas'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
 