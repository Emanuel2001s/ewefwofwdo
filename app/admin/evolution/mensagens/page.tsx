"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MessageCircle, 
  RefreshCw, 
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Image,
  User,
  Calendar,
  AlertTriangle,
  Send
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface Mensagem {
  id: number
  cliente_nome: string
  numero_whatsapp: string
  message_type: 'texto' | 'imagem'
  mensagem_enviada: string
  imagem_enviada?: string
  status: 'enviando' | 'enviada' | 'erro' | 'lida'
  template_nome?: string
  instancia_nome: string
  error_message?: string
  created_at: string
}

interface DashboardStats {
  total_mensagens: number
  enviadas: number
  erro: number
  pendentes: number
}

export default function MensagensPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    total_mensagens: 0,
    enviadas: 0,
    erro: 0,
    pendentes: 0
  })
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(10)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [instanciaFilter, setInstanciaFilter] = useState('')

  const [instancias, setInstancias] = useState<{id: number, nome: string}[]>([])

  const loadMensagens = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      })

      // Adicionar filtros apenas se não estiverem vazios
      if (busca.trim()) params.append('search', busca.trim())
      if (statusFilter) params.append('status', statusFilter)
      if (tipoFilter) params.append('message_type', tipoFilter)
      if (instanciaFilter) params.append('instancia', instanciaFilter)

      const response = await fetch(`/api/evolution/messages/history?${params}`)
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }
      
      const data = await response.json()

      if (data.success) {
      setMensagens(data.mensagens || [])
      setTotalCount(data.total || 0)
        setTotalPages(Math.ceil((data.total || 0) / pageSize))
      setCurrentPage(page)
        // Forçar re-render do layout responsivo
        setRefreshKey(prev => prev + 1)
      } else {
        throw new Error(data.error || 'Erro desconhecido')
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de mensagens: " + (error instanceof Error ? error.message : 'Erro desconhecido'),
        variant: "destructive"
      })
      setMensagens([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [busca, statusFilter, tipoFilter, instanciaFilter, pageSize])

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/evolution/messages/history?stats=true')
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      // Não mostrar toast para erro de estatísticas
    }
  }, [])

  const loadInstancias = useCallback(async () => {
    try {
      const response = await fetch('/api/evolution/instances')
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.instancias) {
        setInstancias(data.instancias.map((inst: any) => ({
          id: inst.id,
          nome: inst.nome
        })))
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error)
      // Não mostrar toast para erro de instâncias
    }
  }, [])

  // Carregamento inicial
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadMensagens(1),
        loadStats(),
        loadInstancias()
      ])
    }
    
    loadData()
  }, [loadMensagens, loadStats, loadInstancias])

  // Filtros com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1)
      }
      loadMensagens(1)
    }, 500)

    return () => clearTimeout(timer)
  }, [busca, statusFilter, tipoFilter, instanciaFilter, loadMensagens])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviada':
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs shrink-0"><CheckCircle className="w-3 h-3 mr-1" />Enviada</Badge>
      case 'erro':
        return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs shrink-0"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>
      case 'enviando':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs shrink-0"><Clock className="w-3 h-3 mr-1" />Enviando</Badge>
      case 'lida':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs shrink-0"><Eye className="w-3 h-3 mr-1" />Lida</Badge>
      default:
        return <Badge variant="secondary" className="text-xs shrink-0">{status}</Badge>
    }
  }

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Data inválida'
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      loadMensagens(newPage)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    loadMensagens(currentPage)
    loadStats()
  }

  return (
    <div key={`messages-page-${refreshKey}`} className="min-h-screen bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
        
        {/* Header Responsivo */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl lg:text-2xl">
              Histórico de Mensagens
            </h1>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                Acompanhe todas as mensagens enviadas via WhatsApp
            </p>
          </div>
            <div className="shrink-0">
            <Button
                onClick={handleRefresh}
              disabled={loading}
                size="sm" 
                className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
            >
                <RefreshCw className={`mr-2 h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-xs sm:text-sm">Atualizar</span>
            </Button>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas Mobile-First */}
        <div key={`stats-${refreshKey}`} className="mb-4 grid w-full grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-4 sm:gap-3 lg:gap-4">
          <Card className="min-w-0 border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-blue-600 p-2 text-white">
              <div className="flex items-center gap-1">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm shrink-0">
                  <Send className="h-2 w-2 sm:h-3 sm:w-3" />
                </div>
                <CardTitle className="text-xs font-semibold truncate">Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="text-sm font-bold text-gray-900 dark:text-white sm:text-lg">
                {stats.total_mensagens}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Mensagens</p>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-green-600 p-2 text-white">
              <div className="flex items-center gap-1">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm shrink-0">
                  <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3" />
                </div>
                <CardTitle className="text-xs font-semibold truncate">Enviadas</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="text-sm font-bold text-gray-900 dark:text-white sm:text-lg">
                {stats.enviadas}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Sucesso</p>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-red-600 p-2 text-white">
              <div className="flex items-center gap-1">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm shrink-0">
                  <XCircle className="h-2 w-2 sm:h-3 sm:w-3" />
                </div>
                <CardTitle className="text-xs font-semibold truncate">Erro</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="text-sm font-bold text-gray-900 dark:text-white sm:text-lg">
                {stats.erro}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Falhas</p>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-yellow-600 p-2 text-white">
              <div className="flex items-center gap-1">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm shrink-0">
                  <Clock className="h-2 w-2 sm:h-3 sm:w-3" />
                </div>
                <CardTitle className="text-xs font-semibold truncate">Pendentes</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="text-sm font-bold text-gray-900 dark:text-white sm:text-lg">
                {stats.pendentes}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Aguardando</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros Responsivos */}
        <Card className="mb-4 w-full border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80 sm:mb-6">
          <CardHeader className="bg-gray-600 p-2 text-white sm:p-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <Filter className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <CardTitle className="text-xs font-semibold sm:text-sm">Filtros</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
              <div className="space-y-1 min-w-0">
                <Label className="text-xs font-medium">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400 sm:h-4 sm:w-4" />
                  <Input
                    placeholder="Cliente ou número..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-6 text-xs sm:pl-8 sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full text-xs sm:text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="enviada">Enviada</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                    <SelectItem value="enviando">Enviando</SelectItem>
                    <SelectItem value="lida">Lida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-xs font-medium">Tipo</Label>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-full text-xs sm:text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-xs font-medium">Instância</Label>
                <Select value={instanciaFilter} onValueChange={setInstanciaFilter}>
                  <SelectTrigger className="w-full text-xs sm:text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {instancias.map((instancia) => (
                      <SelectItem key={instancia.id} value={instancia.id.toString()}>
                        {instancia.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Mensagens - Híbrido Desktop/Mobile */}
        <Card key={`messages-list-${refreshKey}`} className="w-full border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader className="bg-green-600 p-2 text-white sm:p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1 min-w-0 sm:gap-2">
                <MessageCircle className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                <CardTitle className="text-xs font-semibold truncate sm:text-sm">
                  Mensagens ({totalCount})
            </CardTitle>
              </div>
              <div className="shrink-0">
                <Badge variant="secondary" className="w-fit text-xs">
                  Página {currentPage} de {totalPages}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 sm:h-8 sm:w-8"></div>
                <span className="ml-2 text-xs text-gray-600 sm:text-sm">Carregando mensagens...</span>
              </div>
            ) : mensagens.length === 0 ? (
              <div className="p-6 text-center sm:p-8">
                <MessageCircle className="mx-auto h-8 w-8 text-gray-400 sm:h-12 sm:w-12" />
                <h3 className="mt-2 text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">
                  Nenhuma mensagem encontrada
                </h3>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  Não há mensagens que correspondam aos filtros aplicados.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden w-full overflow-x-auto lg:block">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Cliente
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          WhatsApp
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Tipo
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Instância
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-600 dark:bg-gray-800">
                      {mensagens.map((mensagem) => (
                        <tr key={`msg-desktop-${mensagem.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 py-3">
                            <div className="flex items-center min-w-0">
                              <User className="h-3 w-3 text-gray-400 mr-2 shrink-0" />
                              <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {mensagem.cliente_nome || 'Cliente'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-300">
                            {mensagem.numero_whatsapp}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center">
                              {mensagem.message_type === 'imagem' ? (
                                <Image className="h-3 w-3 text-blue-500 mr-1 shrink-0" />
                              ) : (
                                <MessageCircle className="h-3 w-3 text-green-500 mr-1 shrink-0" />
                              )}
                              <span className="text-xs capitalize">{mensagem.message_type}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {getStatusBadge(mensagem.status)}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-300">
                            {mensagem.instancia_nome || 'N/A'}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500">
                            {formatarData(mensagem.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Cards */}
                <div className="w-full space-y-2 p-2 lg:hidden">
                  {mensagens.map((mensagem) => (
                    <Card key={`msg-mobile-${mensagem.id}`} className="w-full border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          {/* Primeira linha: Cliente e Status */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {mensagem.cliente_nome || 'Cliente'}
                              </span>
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(mensagem.status)}
                            </div>
                          </div>
                          
                          {/* Segunda linha: WhatsApp e Tipo */}
                          <div className="grid w-full grid-cols-2 gap-3 text-xs">
                            <div className="min-w-0">
                              <span className="text-gray-500 block">WhatsApp:</span>
                              <p className="font-medium truncate">{mensagem.numero_whatsapp}</p>
                            </div>
                            <div className="min-w-0">
                              <span className="text-gray-500 block">Tipo:</span>
                              <div className="flex items-center gap-1">
                                {mensagem.message_type === 'imagem' ? (
                                  <Image className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <MessageCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                )}
                                <span className="capitalize">{mensagem.message_type}</span>
                              </div>
                            </div>
                          </div>

                          {/* Terceira linha: Instância e Data */}
                          <div className="grid w-full grid-cols-2 gap-3 text-xs">
                            <div className="min-w-0">
                              <span className="text-gray-500 block">Instância:</span>
                              <p className="font-medium truncate">{mensagem.instancia_nome || 'N/A'}</p>
                            </div>
                            <div className="min-w-0">
                              <span className="text-gray-500 block">Data:</span>
                              <p className="font-medium text-xs">{formatarData(mensagem.created_at)}</p>
                            </div>
                          </div>

                          {/* Mensagem de erro se houver */}
                          {mensagem.error_message && (
                            <div className="rounded bg-red-50 p-2 dark:bg-red-900/20 mt-2">
                              <div className="flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                                <span className="text-xs text-red-700 dark:text-red-300 break-words">
                                  {mensagem.error_message}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Paginação Responsiva */}
                {totalPages > 1 && (
                  <div className="border-t bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700 sm:p-3">
                    <div className="flex w-full items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="text-xs px-2 py-1 sm:px-3 sm:py-2 sm:text-sm"
                      >
                        Anterior
                      </Button>
                      
                      <span className="text-xs text-gray-600 dark:text-gray-300 px-2 sm:text-sm">
                        {currentPage} de {totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="text-xs px-2 py-1 sm:px-3 sm:py-2 sm:text-sm"
                      >
                        Próximo
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 