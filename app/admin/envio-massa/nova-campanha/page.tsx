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
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Loading } from "@/components/ui/loading"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"

type Template = {
  id: number
  nome: string
  mensagem: string
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

type EtapaCampanha = 'informacoes' | 'template' | 'clientes' | 'configuracoes' | 'revisao'

const ETAPAS: EtapaCampanha[] = ['informacoes', 'template', 'clientes', 'configuracoes', 'revisao']

const ETAPAS_INFO = {
  'informacoes': {
    nome: 'Informações',
    descricao: 'Nome e descrição da campanha',
    icone: MessageCircle
  },
  'template': {
    nome: 'Template',
    descricao: 'Escolha da mensagem',
    icone: MessageCircle
  },
  'clientes': {
    nome: 'Clientes',
    descricao: 'Seleção de destinatários',
    icone: Users
  },
  'configuracoes': {
    nome: 'Configurações',
    descricao: 'Instância e intervalos',
    icone: Settings
  },
  'revisao': {
    nome: 'Revisão',
    descricao: 'Confirmar e enviar',
    icone: Eye
  }
} as const

function getTempoEstimado(clientes: number, intervalo: number): string {
  const totalSegundos = clientes * intervalo
  const minutos = Math.floor(totalSegundos / 60)
  const horas = Math.floor(minutos / 60)
  
  if (horas > 0) {
    const minutosRestantes = minutos % 60
    return `Tempo estimado: ${horas}h${minutosRestantes > 0 ? ` ${minutosRestantes}min` : ''}`
  } else if (minutos > 0) {
    const segundosRestantes = totalSegundos % 60
    return `Tempo estimado: ${minutos}min${segundosRestantes > 0 ? ` ${segundosRestantes}s` : ''}`
  } else {
    return `Tempo estimado: ${totalSegundos} segundos`
  }
}

export default function NovaCampanhaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [etapaAtual, setEtapaAtual] = useState<EtapaCampanha>('informacoes')
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
    intervalo_segundos: 30
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
    const indexAtual = ETAPAS.indexOf(etapaAtual)
    if (indexAtual < ETAPAS.length - 1 && validarEtapaAtual()) {
      setEtapaAtual(ETAPAS[indexAtual + 1])
    }
  }

  const etapaAnterior = () => {
    const indexAtual = ETAPAS.indexOf(etapaAtual)
    if (indexAtual > 0) {
      setEtapaAtual(ETAPAS[indexAtual - 1])
    }
  }

  const getEtapaNumero = (etapa: EtapaCampanha): number => {
    return ETAPAS.indexOf(etapa) + 1
  }

  const getTotalEtapas = (): number => {
    return ETAPAS.length
  }

  const validarEtapaAtual = (): boolean => {
    if (etapaAtual === 'informacoes') {
      if (!campanha.nome?.trim()) {
        toast({
          title: "Nome obrigatório",
          description: "Digite um nome para a campanha",
          variant: "destructive"
        })
        return false
      }
      return true
    }

    if (etapaAtual === 'template') {
      if (!campanha.template_id) {
        toast({
          title: "Template obrigatório",
          description: "Selecione um template para a campanha",
          variant: "destructive"
        })
        return false
      }
      return true
    }

    if (etapaAtual === 'clientes') {
      if (totalClientes === 0) {
        toast({
          title: "Nenhum cliente selecionado",
          description: "Selecione pelo menos um cliente para enviar a campanha",
          variant: "destructive"
        })
        return false
      }
      return true
    }

    if (etapaAtual === 'configuracoes') {
      if (!campanha.instancia_id) {
        toast({
          title: "Instância obrigatória",
          description: "Selecione uma instância WhatsApp para enviar as mensagens",
          variant: "destructive"
        })
        return false
      }

      const instanciaAtual = instancias.find(i => i.id === campanha.instancia_id)
      if (!instanciaAtual || (instanciaAtual.status !== 'conectada' && instanciaAtual.status !== 'connected')) {
        toast({
          title: "Instância desconectada",
          description: "A instância selecionada não está conectada",
          variant: "destructive"
        })
        return false
      }

      if (campanha.data_agendamento) {
        const dataAgendamento = new Date(campanha.data_agendamento)
        if (dataAgendamento < new Date()) {
          toast({
            title: "Data de agendamento inválida",
            description: "A data de agendamento deve ser futura",
            variant: "destructive"
          })
          return false
        }
      }

      return true
    }

    if (etapaAtual === 'revisao') {
      // Validar todas as etapas novamente
      if (!campanha.nome?.trim()) {
        toast({
          title: "Nome obrigatório",
          description: "Volte à primeira etapa e digite um nome para a campanha",
          variant: "destructive"
        })
        return false
      }

      if (!campanha.template_id) {
        toast({
          title: "Template obrigatório",
          description: "Volte à etapa de template e selecione um template",
          variant: "destructive"
        })
        return false
      }

      if (totalClientes === 0) {
        toast({
          title: "Nenhum cliente selecionado",
          description: "Volte à etapa de clientes e selecione pelo menos um cliente",
          variant: "destructive"
        })
        return false
      }

      if (!campanha.instancia_id) {
        toast({
          title: "Instância obrigatória",
          description: "Volte à etapa de configurações e selecione uma instância",
          variant: "destructive"
        })
        return false
      }

      const instanciaAtual = instancias.find(i => i.id === campanha.instancia_id)
      if (!instanciaAtual || (instanciaAtual.status !== 'conectada' && instanciaAtual.status !== 'connected')) {
        toast({
          title: "Instância desconectada",
          description: "Volte à etapa de configurações e selecione uma instância conectada",
          variant: "destructive"
        })
        return false
      }

      if (campanha.data_agendamento) {
        const dataAgendamento = new Date(campanha.data_agendamento)
        if (dataAgendamento < new Date()) {
          toast({
            title: "Data de agendamento inválida",
            description: "Volte à etapa de configurações e corrija a data de agendamento",
            variant: "destructive"
          })
          return false
        }
      }

      return true
    }

    return true
  }

  const criarCampanha = async () => {
    // Validar dados obrigatórios
    if (!campanha.nome?.trim()) {
      toast({
        title: "Erro",
        description: "Nome da campanha é obrigatório",
        variant: "destructive"
      })
      return
    }

    if (!campanha.template_id) {
      toast({
        title: "Erro",
        description: "Selecione um template",
        variant: "destructive"
      })
      return
    }

    if (!campanha.instancia_id) {
      toast({
        title: "Erro",
        description: "Selecione uma instância",
        variant: "destructive"
      })
      return
    }

    if (!filtroSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um filtro de clientes",
        variant: "destructive"
      })
      return
    }

    if (!campanha.intervalo_segundos || campanha.intervalo_segundos < 1) {
      toast({
        title: "Erro",
        description: "Intervalo entre mensagens deve ser maior que 0",
        variant: "destructive"
      })
      return
    }

    setCriandoCampanha(true)
    try {
      // Preparar dados da campanha
      const dadosCampanha = {
        nome: campanha.nome.trim(),
        template_id: campanha.template_id,
        instancia_id: campanha.instancia_id,
        filtro_clientes: getFiltroClientes(filtroSelecionado),
        intervalo_segundos: campanha.intervalo_segundos,
        data_agendamento: campanha.data_agendamento || null,
        descricao: campanha.descricao?.trim() || null
      }

      const response = await fetch('/api/envio-massa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosCampanha)
      })

      let errorData
      try {
        errorData = await response.json()
      } catch (e) {
        throw new Error('Erro ao processar resposta do servidor')
      }

      if (!response.ok) {
        throw new Error(errorData.error || 'Erro ao criar campanha')
      }

      if (errorData.success) {
        toast({
          title: "Sucesso",
          description: errorData.message
        })
        router.push('/admin/envio-massa')
      } else {
        throw new Error(errorData.error || 'Erro ao criar campanha')
      }
    } catch (error: any) {
      console.error('Erro ao criar campanha:', error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar campanha",
        variant: "destructive"
      })
    } finally {
      setCriandoCampanha(false)
    }
  }

  const getFiltroClientes = (filtro: string) => {
    if (filtro.startsWith('plano-')) {
      return {
        plano_id: parseInt(filtro.split('-')[1])
      }
    }

    switch (filtro) {
      case 'ativo':
        return { status: 'ativo' }
      case 'inativo':
        return { status: 'inativo' }
      case 'vencidos':
        return { vencidos: true }
      case 'proximos_vencimento':
        return { proximos_vencimento: true }
      default:
        return { status: 'ativo' } // Filtro padrão
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
          const isAtual = etapa === etapaAtual
          const isConcluida = index < ETAPAS.indexOf(etapaAtual)
          const info = ETAPAS_INFO[etapa]
          const Icone = info.icone
          
          return (
            <Card 
              key={etapa}
              className={`relative ${
                isAtual 
                  ? 'ring-2 ring-blue-500'
                  : isConcluida
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`
                    rounded-full p-2
                    ${isAtual 
                      ? 'bg-blue-100 text-blue-600'
                      : isConcluida
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}>
                    <Icone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`
                      font-medium
                      ${isAtual 
                        ? 'text-blue-600'
                        : isConcluida
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                      {info.nome}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {info.descricao}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Conteúdo da Etapa */}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">
            {ETAPAS_INFO[etapaAtual].nome}
          </CardTitle>
          <CardDescription className="text-base">
            {ETAPAS_INFO[etapaAtual].descricao}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {renderConteudoEtapa()}
          
          {/* Botões de Navegação */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={etapaAnterior}
              disabled={etapaAtual === 'informacoes'}
              className="px-6"
            >
              Anterior
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{getEtapaNumero(etapaAtual)} de {getTotalEtapas()}</span>
            </div>
            
            {etapaAtual === 'revisao' ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="px-6" disabled={criandoCampanha}>
                    {criandoCampanha ? 'Criando...' : 'Criar Campanha'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar criação da campanha</AlertDialogTitle>
                    <AlertDialogDescription>
                      {campanha.data_agendamento ? (
                        <>
                          A campanha será agendada para {new Date(campanha.data_agendamento).toLocaleString()}.
                          Você poderá cancelar o agendamento até o horário definido.
                        </>
                      ) : (
                        <>
                          A campanha será iniciada imediatamente após a criação.
                          Este processo não pode ser desfeito.
                        </>
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
              <Button onClick={proximaEtapa} className="px-6">
                Próxima
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  function renderConteudoEtapa() {
    switch (etapaAtual) {
      case 'informacoes':
        return renderEtapaInformacoes()
      case 'template':
        return renderEtapaTemplate()
      case 'clientes':
        return renderEtapaClientes()
      case 'configuracoes':
        return renderEtapaConfiguracoes()
      case 'revisao':
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
                      {template.mensagem}
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
                      <p className="text-sm text-gray-500">
                        Status: {instancia.status === 'connected' ? 'Conectada' : instancia.status}
                      </p>
                    </div>
                    {campanha.instancia_id === instancia.id && (
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!campanha.instancia_id && (
            <p className="text-sm text-red-500">
              Selecione uma instância para continuar
            </p>
          )}
        </div>

        {/* Configurações de Envio */}
        <div className="space-y-4">
          <Label className="text-base font-medium">
            Intervalo entre envios: {campanha.intervalo_segundos} segundos
          </Label>
          <div className="relative">
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
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-sm text-gray-500">
              <span className="relative" style={{ left: '0%' }}>5s</span>
              <span className="relative" style={{ left: '0%' }}>30s</span>
              <span className="relative" style={{ right: '0%' }}>60s</span>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-8">
            <span>Rápido</span>
            <span>Recomendado</span>
            <span>Seguro</span>
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
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                Intervalos maiores reduzem o risco de bloqueio do WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Agendamento */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Agendamento (Opcional)</Label>
          <div className="flex items-center gap-4">
            <input
              type="datetime-local"
              className="px-3 py-2 border rounded-md"
              value={campanha.data_agendamento || ''}
              onChange={(e) => setCampanha({
                ...campanha,
                data_agendamento: e.target.value || undefined
              })}
              min={new Date().toISOString().slice(0, 16)}
            />
            {campanha.data_agendamento && (
              <Button
                variant="ghost"
                onClick={() => setCampanha({
                  ...campanha,
                  data_agendamento: undefined
                })}
              >
                Limpar
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {campanha.data_agendamento 
              ? `A campanha será iniciada em ${new Date(campanha.data_agendamento).toLocaleString()}`
              : 'A campanha será iniciada imediatamente após a criação'}
          </p>
        </div>
      </div>
    )
  }

  function renderEtapaRevisao() {
    const getPreviewMensagem = () => {
      if (!templateSelecionado) return ''
      
      // Exemplo de substituição de variáveis
      let preview = templateSelecionado.mensagem
        .replace(/\{nome\}/g, 'João Silva')
        .replace(/\{plano\}/g, 'Plano Premium')
        .replace(/\{vencimento\}/g, '15/04/2024')
      
      return preview
    }

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
                <p className="text-sm text-green-600">
                  Status: {instanciaSelecionada?.status === 'connected' ? 'Conectada' : instanciaSelecionada?.status}
                </p>
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
              <div>
                <Label className="text-sm font-medium text-gray-500">Agendamento</Label>
                {campanha.data_agendamento ? (
                  <>
                    <p className="text-base font-medium">
                      {new Date(campanha.data_agendamento).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">Campanha agendada</p>
                  </>
                ) : (
                  <p className="text-base">Envio imediato após criação</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview da Mensagem */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview da Mensagem</CardTitle>
            <CardDescription>
              Exemplo de como a mensagem será exibida para os clientes (com variáveis substituídas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border">
              <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {getPreviewMensagem()}
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>* As variáveis serão substituídas pelos dados reais de cada cliente</p>
            </div>
          </CardContent>
        </Card>

        {/* Alertas e Validações */}
        {totalClientes > 500 && campanha.intervalo_segundos < 45 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Atenção: Volume Alto de Mensagens
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Para {totalClientes} clientes, recomendamos um intervalo maior (45-60s) para evitar bloqueios do WhatsApp.
                  Considere aumentar o intervalo ou dividir em múltiplas campanhas.
                </p>
              </div>
            </div>
          </div>
        )}
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
} 