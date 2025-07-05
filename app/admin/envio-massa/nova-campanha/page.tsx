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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Loading } from "@/components/ui/loading"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"

type Template = {
  id: number
  nome: string
  conteudo: string
  message_type: string
}

type Instancia = {
  id: number
  instance_name: string
  status: string
}

type Plano = {
  id: number
  nome: string
}

type Campanha = {
  nome: string
  template_id: number
  instancia_id: number
  filtro_clientes: {
    status?: string
    vencidos?: boolean
    proximos_vencimento?: boolean
    plano_id?: number
  }
  intervalo_segundos: number
  data_agendamento?: string
  descricao?: string
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
  const [planos, setPlanos] = useState<Plano[]>([])
  const [campanha, setCampanha] = useState<Campanha>({
    nome: '',
    template_id: 0,
    instancia_id: 0,
    filtro_clientes: {},
    intervalo_segundos: 10
  })
  
  const [filtroSelecionado, setFiltroSelecionado] = useState<string>('todos')
  const [totalClientes, setTotalClientes] = useState(0)
  const [filtros, setFiltros] = useState<any>({})

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [templatesRes, instanciasRes, planosRes, filtrosRes] = await Promise.all([
        fetch('/api/envio-massa/templates'),
        fetch('/api/envio-massa/instancias'),
        fetch('/api/planos'),
        fetch('/api/envio-massa/clientes/filtros')
      ])

      const [templatesData, instanciasData, planosData, filtrosData] = await Promise.all([
        templatesRes.json(),
        instanciasRes.json(),
        planosRes.json(),
        filtrosRes.json()
      ])

      setTemplates(templatesData.templates || [])
      setInstancias(instanciasData.instancias || [])
      setPlanos(planosData.planos || [])
      setFiltros(filtrosData.filtros || {})
      
      // Definir filtros iniciais
      setCampanha(prev => ({
        ...prev,
        filtro_clientes: filtrosData.filtros?.ativos?.filtro || {}
      }))
      
      // Definir total inicial (clientes ativos)
      setTotalClientes(filtrosData.filtros?.ativos?.total || 0)
      setFiltroSelecionado('ativos')
      
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
        return campanha.template_id !== 0
      case 3:
        return filtroSelecionado !== '' && totalClientes > 0
      case 4:
        if (!campanha.instancia_id) return false
        if (campanha.data_agendamento) {
          const dataAgendamento = new Date(campanha.data_agendamento as string)
          if (dataAgendamento <= new Date()) return false
        }
        return true
      default:
        return true
    }
  }

  const criarCampanha = async () => {
    if (!validarEtapaAtual()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios corretamente.",
        variant: "destructive"
      })
      return
    }

    setCriandoCampanha(true)
    try {
      const response = await fetch('/api/envio-massa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campanha)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Sucesso",
          description: data.message
        })
        router.push('/admin/envio-massa')
      } else {
        throw new Error(data.error || 'Erro ao criar campanha')
      }
    } catch (error) {
      console.error('Erro ao criar campanha:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar campanha",
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
      <Loading />
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
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
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar criação da campanha</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja criar esta campanha de envio em massa?
                      {campanha.data_agendamento ? (
                        <p className="mt-2">
                          A campanha será agendada para: {new Date(campanha.data_agendamento).toLocaleString()}
                        </p>
                      ) : (
                        <p className="mt-2">
                          A campanha será iniciada imediatamente após a criação.
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={criarCampanha}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
              value={campanha.descricao || ''}
              onChange={(e) => setCampanha({ ...campanha, descricao: e.target.value })}
              rows={4}
              className="resize-none"
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
                  <Badge variant="outline">{template.message_type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4">
                      {template.conteudo}
                    </p>
                  </div>
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
          {/* Filtros padrão */}
          {Object.entries(filtros).map(([key, filtro]: [string, any]) => {
            if (key === 'por_plano') return null // Renderizar planos separadamente
            
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
                  setCampanha({ ...campanha, filtro_clientes: filtro.filtro })
                  setTotalClientes(filtro.total)
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {filtro.nome}
                      </h3>
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

          {/* Filtros por plano */}
          {filtros.por_plano?.map((plano: any) => (
            <Card
              key={`plano-${plano.id}`}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                filtroSelecionado === `plano-${plano.id}`
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:ring-1 hover:ring-gray-300'
              }`}
              onClick={() => {
                setFiltroSelecionado(`plano-${plano.id}`)
                setCampanha({ ...campanha, filtro_clientes: plano.filtro })
                setTotalClientes(plano.total)
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {plano.nome}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {plano.total}
                    </p>
                    <p className="text-xs text-gray-500">clientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
    const instanciasDisponiveis = instancias.filter(i => i.status === 'conectada' || i.status === 'connected')
    
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
                        {instancia.instance_name}
                      </h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                  <p className="text-base">{campanha.descricao || 'Sem descrição'}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-gray-500">Template</Label>
                <p className="text-base font-medium">{templateSelecionado?.nome}</p>
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
                <p className="text-base font-medium">{instanciaSelecionada?.instance_name}</p>
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
                {templateSelecionado?.conteudo}
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
      'ativo': 'Clientes com status ativo',
      'inativo': 'Clientes com status inativo', 
      'vencidos': 'Clientes com vencimento passado',
      'proximos_vencimento': 'Vencimento nos próximos 7 dias'
    }
    return descricoes[key] || 'Filtro personalizado'
  }

  function getFiltroDescricao(filtro: string): string {
    if (filtro.startsWith('plano-')) {
      const plano = planos.find(p => p.id === parseInt(filtro.split('-')[1]))
      return plano?.nome || 'Filtro por plano'
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