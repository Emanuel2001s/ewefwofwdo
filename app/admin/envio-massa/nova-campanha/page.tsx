"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  ChevronRight,
  Users,
  MessageCircle,
  Settings,
  Send,
  Eye,
  Clock,
  AlertCircle
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Template {
  id: number
  nome: string
  conteudo: string
  categoria: string
  preview: string
  variaveis: string[]
}

interface Instancia {
  id: number
  nome: string
  status: string
  disponivel: boolean
  statusTexto: string
  statusCor: string
}

interface FiltroClientes {
  nome: string
  total: number
  filtro: any
}

interface CampanhaData {
  nome: string
  descricao: string
  template_id: number | null
  instancia_id: number | null
  filtro_clientes: any
  intervalo_segundos: number
  agendamento: 'imediato' | 'agendado'
  data_agendamento?: string
}

const ETAPAS = [
  { id: 1, nome: "Informações", icone: MessageCircle, descricao: "Nome e descrição da campanha" },
  { id: 2, nome: "Template", icone: MessageCircle, descricao: "Escolha da mensagem" },
  { id: 3, nome: "Clientes", icone: Users, descricao: "Seleção de destinatários" },
  { id: 4, nome: "Configurações", icone: Settings, descricao: "Instância e intervalos" },
  { id: 5, nome: "Revisão", icone: Eye, descricao: "Confirmar e enviar" }
]

export default function NovaCampanhaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [loading, setLoading] = useState(false)
  const [criandoCampanha, setCriandoCampanha] = useState(false)
  
  // Estados dos dados
  const [templates, setTemplates] = useState<Template[]>([])
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [filtrosClientes, setFiltrosClientes] = useState<any>({})
  
  // Estado da campanha
  const [campanha, setCampanha] = useState<CampanhaData>({
    nome: "",
    descricao: "",
    template_id: null,
    instancia_id: null,
    filtro_clientes: {},
    intervalo_segundos: 10,
    agendamento: 'imediato'
  })
  
  const [filtroSelecionado, setFiltroSelecionado] = useState<string>('todos')
  const [totalClientes, setTotalClientes] = useState(0)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [templatesRes, instanciasRes, filtrosRes] = await Promise.all([
        fetch('/api/envio-massa/templates'),
        fetch('/api/envio-massa/instancias'),
        fetch('/api/envio-massa/clientes/filtros')
      ])

      const [templatesData, instanciasData, filtrosData] = await Promise.all([
        templatesRes.json(),
        instanciasRes.json(),
        filtrosRes.json()
      ])

      setTemplates(templatesData.templates || [])
      setInstancias(instanciasData.instancias || [])
      setFiltrosClientes(filtrosData.filtros || {})
      
      // Definir total inicial (todos os clientes)
      setTotalClientes(filtrosData.filtros?.todos?.total || 0)
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados necessários",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const proximaEtapa = () => {
    if (etapaAtual < ETAPAS.length) {
      setEtapaAtual(etapaAtual + 1)
    }
  }

  const etapaAnterior = () => {
    if (etapaAtual > 1) {
      setEtapaAtual(etapaAtual - 1)
    }
  }

  const validarEtapaAtual = (): boolean => {
    switch (etapaAtual) {
      case 1:
        return campanha.nome.trim().length > 0
      case 2:
        return campanha.template_id !== null
      case 3:
        return filtroSelecionado !== '' && totalClientes > 0
      case 4:
        if (!campanha.instancia_id) return false
        if (campanha.agendamento === 'agendado') {
          if (!campanha.data_agendamento) return false
          const dataAgendamento = new Date(campanha.data_agendamento as string)
          if (dataAgendamento <= new Date()) return false
        }
        return true
      default:
        return true
    }
  }

  const criarCampanha = async () => {
    setCriandoCampanha(true)
    try {
      // Criar a campanha
      const response = await fetch('/api/envio-massa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campanha,
          agendamento: 'imediato'
        })
      })

      const data = await response.json()

      if (data.success) {
        const campanhaId = data.campanha_id

        // Perguntar se deseja iniciar imediatamente
        const iniciarAgora = window.confirm(
          `Campanha criada com sucesso!\n\n` +
          `• ${data.total_clientes} cliente(s) serão incluídos\n` +
          `• Intervalo: ${campanha.intervalo_segundos} segundos entre envios\n\n` +
          `Deseja iniciar o envio agora?`
        )

        if (iniciarAgora) {
          // Iniciar campanha
          const iniciarResponse = await fetch(`/api/envio-massa/${campanhaId}/iniciar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })

          const iniciarData = await iniciarResponse.json()

          if (iniciarData.success) {
            toast({
              title: "Campanha Iniciada!",
              description: `Envio em massa iniciado para ${data.total_clientes} cliente(s)`,
            })
          } else {
            toast({
              title: "Campanha Criada",
              description: "Campanha criada mas não foi possível iniciar automaticamente",
              variant: "default"
            })
          }
        } else {
          toast({
            title: "Campanha Criada!",
            description: "Campanha salva como rascunho. Inicie quando desejar.",
          })
        }

        router.push('/admin/envio-massa')
      } else {
        throw new Error(data.error || 'Erro ao criar campanha')
      }
    } catch (error) {
      console.error('Erro ao criar campanha:', error)
      toast({
        title: "Erro",
        description: "Erro ao criar campanha",
        variant: "destructive"
      })
    } finally {
      setCriandoCampanha(false)
    }
  }

  const templateSelecionado = templates.find(t => t.id === campanha.template_id)
  const instanciaSelecionada = instancias.find(i => i.id === campanha.instancia_id)

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nova Campanha</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Carregando...</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push('/admin/envio-massa')}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nova Campanha</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Crie uma campanha de envio em massa
          </p>
        </div>
      </div>

      {/* Indicador de Etapas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {ETAPAS.map((etapa, index) => {
          const isAtual = etapa.id === etapaAtual
          const isConcluida = etapa.id < etapaAtual
          const Icone = etapa.icone
          
          return (
            <Card 
              key={etapa.id}
              className={`relative ${
                isAtual 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : isConcluida 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-gray-50 dark:bg-gray-800'
              }`}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    isAtual 
                      ? 'bg-blue-500 text-white' 
                      : isConcluida 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {isConcluida ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icone className="h-4 w-4" />
                    )}
                  </div>
                  <div className="hidden md:block flex-1">
                    <p className={`font-medium ${
                      isAtual ? 'text-blue-700 dark:text-blue-300' : 
                      isConcluida ? 'text-green-700 dark:text-green-300' : 
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {etapa.nome}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {etapa.descricao}
                    </p>
                  </div>
                </div>
                
                {/* Linha conectora para desktop */}
                {index < ETAPAS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Conteúdo da Etapa */}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">
            {ETAPAS[etapaAtual - 1].nome}
          </CardTitle>
          <CardDescription className="text-base">
            {ETAPAS[etapaAtual - 1].descricao}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {renderEtapa()}
          
          {/* Botões de Navegação */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={etapaAnterior}
              disabled={etapaAtual === 1}
              className="px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{etapaAtual} de {ETAPAS.length}</span>
            </div>
            
            {etapaAtual === ETAPAS.length ? (
              <Button
                onClick={criarCampanha}
                disabled={!validarEtapaAtual() || criandoCampanha}
                className="bg-green-600 hover:bg-green-700 px-8"
              >
                {criandoCampanha ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Criar Campanha
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={proximaEtapa}
                disabled={!validarEtapaAtual()}
                className="px-8"
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  function renderEtapa() {
    switch (etapaAtual) {
      case 1:
        return renderEtapaInformacoes()
      case 2:
        return renderEtapaTemplate()
      case 3:
        return renderEtapaClientes()
      case 4:
        return renderEtapaConfiguracoes()
      case 5:
        return renderEtapaRevisao()
      default:
        return null
    }
  }

  function renderEtapaInformacoes() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-base font-medium">
              Nome da Campanha *
            </Label>
            <Input
              id="nome"
              placeholder="Ex: Aviso de Manutenção - Janeiro 2024"
              value={campanha.nome}
              onChange={(e) => setCampanha({ ...campanha, nome: e.target.value })}
              className="text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-base font-medium">
              Descrição (Opcional)
            </Label>
            <Textarea
              id="descricao"
              placeholder="Descrição detalhada da campanha..."
              value={campanha.descricao}
              onChange={(e) => setCampanha({ ...campanha, descricao: e.target.value })}
              rows={4}
              className="text-base"
            />
          </div>
        </div>
      </div>
    )
  }

  function renderEtapaTemplate() {
    if (templates.length === 0) {
      return (
        <div className="text-center py-12 space-y-4">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Nenhum template encontrado
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Crie templates de mensagem primeiro para usar nesta campanha
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                campanha.template_id === template.id
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:ring-1 hover:ring-gray-300'
              }`}
              onClick={() => setCampanha({ ...campanha, template_id: template.id })}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{template.nome}</CardTitle>
                  <Badge variant="outline">{template.categoria}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4">
                      {template.preview}
                    </p>
                  </div>
                  
                  {template.variaveis && template.variaveis.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Variáveis disponíveis:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.variaveis.map((variavel, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {variavel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  function renderEtapaClientes() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(filtrosClientes).map(([key, filtro]: [string, any]) => {
            if (key === 'por_plano') {
              // Renderizar filtros por plano separadamente
              return filtro.map((planoFiltro: any) => (
                <Card
                  key={`plano-${planoFiltro.id}`}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    filtroSelecionado === `plano-${planoFiltro.id}`
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:ring-1 hover:ring-gray-300'
                  }`}
                  onClick={() => {
                    setFiltroSelecionado(`plano-${planoFiltro.id}`)
                    setCampanha({ ...campanha, filtro_clientes: { tipo_filtro: `plano-${planoFiltro.id}`, ...planoFiltro.filtro } })
                    setTotalClientes(planoFiltro.total)
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {planoFiltro.nome}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Filtro por plano específico
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {planoFiltro.total}
                        </p>
                        <p className="text-xs text-gray-500">clientes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            }
            
            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  filtroSelecionado === key
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:ring-1 hover:ring-gray-300'
                }`}
                onClick={() => {
                  setFiltroSelecionado(key)
                  setCampanha({ ...campanha, filtro_clientes: { tipo_filtro: key, ...filtro.filtro } })
                  setTotalClientes(filtro.total)
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {filtro.nome}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {getDescricaoFiltro(key)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {filtro.total}
                      </p>
                      <p className="text-xs text-gray-500">clientes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {totalClientes > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  {totalClientes} cliente{totalClientes !== 1 ? 's' : ''} selecionado{totalClientes !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {getTempoEstimado(totalClientes, campanha.intervalo_segundos)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderEtapaConfiguracoes() {
    const instanciasDisponiveis = instancias.filter(i => i.disponivel)
    
    if (instanciasDisponiveis.length === 0) {
      return (
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Nenhuma instância disponível
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Configure uma instância WhatsApp conectada para enviar mensagens
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        {/* Seleção de Instância */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Instância WhatsApp *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {instanciasDisponiveis.map((instancia) => (
              <Card
                key={instancia.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  campanha.instancia_id === instancia.id
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:ring-1 hover:ring-gray-300'
                }`}
                onClick={() => setCampanha({ ...campanha, instancia_id: instancia.id })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {instancia.nome}
                      </h3>
                      <Badge className={`mt-1 ${
                        instancia.statusCor === 'green' 
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {instancia.statusTexto}
                      </Badge>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      instancia.disponivel ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Agendamento */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Agendamento</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-all hover:shadow-lg ${
                campanha.agendamento === 'imediato'
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:ring-1 hover:ring-gray-300'
              }`}
              onClick={() => setCampanha({ ...campanha, agendamento: 'imediato' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Enviar Agora
                    </h3>
                    <p className="text-sm text-gray-500">
                      Iniciar envio imediatamente após criar
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-lg ${
                campanha.agendamento === 'agendado'
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:ring-1 hover:ring-gray-300'
              }`}
              onClick={() => setCampanha({ ...campanha, agendamento: 'agendado' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Agendar Envio
                    </h3>
                    <p className="text-sm text-gray-500">
                      Escolher data e hora para iniciar
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {campanha.agendamento === 'agendado' && (
            <div className="space-y-2 pt-4">
              <Label htmlFor="data_agendamento" className="text-base font-medium">
                Data e Hora do Envio *
              </Label>
              <Input
                id="data_agendamento"
                type="datetime-local"
                value={campanha.data_agendamento || ''}
                onChange={(e) => setCampanha({ 
                  ...campanha, 
                  data_agendamento: e.target.value 
                })}
                min={new Date().toISOString().slice(0, 16)}
                className="text-base"
              />
            </div>
          )}
        </div>

        {/* Configurações de Envio */}
        <div className="space-y-4">
          <Label className="text-base font-medium">
            Intervalo entre envios: {campanha.intervalo_segundos} segundos
          </Label>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={campanha.intervalo_segundos}
            onChange={(e) => setCampanha({ 
              ...campanha, 
              intervalo_segundos: parseInt(e.target.value) 
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>5s (Rápido)</span>
            <span>30s (Recomendado)</span>
            <span>60s (Seguro)</span>
          </div>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Recomendações de Intervalo
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                <li>• <strong>5-10s:</strong> Para poucos clientes (&lt;50)</li>
                <li>• <strong>15-30s:</strong> Recomendado para a maioria dos casos</li>
                <li>• <strong>45-60s:</strong> Para grandes volumes (&gt;500 clientes)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderEtapaRevisao() {
    return (
      <div className="space-y-8">
        {/* Resumo da Campanha */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Campanha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Nome</Label>
                <p className="text-base font-medium">{campanha.nome}</p>
              </div>
              {campanha.descricao && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Descrição</Label>
                  <p className="text-base">{campanha.descricao}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-gray-500">Template</Label>
                <p className="text-base font-medium">{templateSelecionado?.nome}</p>
                <Badge variant="outline" className="mt-1">
                  {templateSelecionado?.categoria}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Envio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Instância WhatsApp</Label>
                <p className="text-base font-medium">{instanciaSelecionada?.nome}</p>
                <Badge className="mt-1 bg-green-100 text-green-800 border-green-200">
                  {instanciaSelecionada?.statusTexto}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Destinatários</Label>
                <p className="text-base font-medium">
                  {totalClientes} cliente{totalClientes !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500">
                  {getFiltroDescricao(filtroSelecionado)}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Intervalo</Label>
                <p className="text-base font-medium">{campanha.intervalo_segundos} segundos</p>
                <p className="text-sm text-gray-500">
                  {getTempoEstimado(totalClientes, campanha.intervalo_segundos)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview da Mensagem */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview da Mensagem</CardTitle>
            <CardDescription>
              Assim ficará a mensagem enviada para os clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border">
              <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {templateSelecionado?.preview || templateSelecionado?.conteudo}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  function getDescricaoFiltro(key: string): string {
    const descricoes: { [key: string]: string } = {
      'todos': 'Todos os clientes cadastrados',
      'ativos': 'Clientes com status ativo',
      'inativos': 'Clientes com status inativo', 
      'vencidos': 'Clientes com vencimento passado',
      'proximos_vencimento': 'Vencimento nos próximos 7 dias'
    }
    return descricoes[key] || 'Filtro personalizado'
  }

  function getFiltroDescricao(filtro: string): string {
    if (filtro.startsWith('plano-')) {
      const planoFiltro = filtrosClientes.por_plano?.find((p: any) => 
        `plano-${p.id}` === filtro
      )
      return planoFiltro?.nome || 'Filtro por plano'
    }
    return getDescricaoFiltro(filtro)
  }

  function getTempoEstimado(clientes: number, intervalo: number): string {
    const totalSegundos = clientes * intervalo
    const minutos = Math.floor(totalSegundos / 60)
    const horas = Math.floor(minutos / 60)
    
    if (horas > 0) {
      return `Tempo estimado: ${horas}h ${minutos % 60}min`
    } else if (minutos > 0) {
      return `Tempo estimado: ${minutos} minutos`
    } else {
      return `Tempo estimado: ${totalSegundos} segundos`
    }
  }
} 