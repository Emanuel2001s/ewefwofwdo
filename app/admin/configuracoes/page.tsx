"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Settings, Upload, User, Monitor, Save, Eye, EyeOff, MessageCircle, Zap, CheckCircle, XCircle, Smartphone, Plus, QrCode, RefreshCw, Trash2, Power, LogOut, Wifi, WifiOff, AlertTriangle, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Configuracao {
  id: number
  chave: string
  valor: string
  descricao: string
}

interface Instancia {
  id: number
  nome: string
  instance_name: string
  status: 'criando' | 'creating' | 'desconectada' | 'close' | 'conectada' | 'open' | 'connecting' | 'conectando' | 'erro'
  qr_code?: string
  created_at: string
  updated_at: string
  is_default?: boolean
}

interface EvolutionConfig {
  apiUrl: string
  apiKey: string
  instanceName: string
}

// Componente para gerenciar instâncias WhatsApp (dependente do status de conexão)
function WhatsAppInstancesManager({ connectionStatus }: { connectionStatus: 'idle' | 'success' | 'error' }) {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedQR, setSelectedQR] = useState<string>('')
  const [selectedInstance, setSelectedInstance] = useState<string>('')
  const [qrRefreshInterval, setQrRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [qrCountdown, setQrCountdown] = useState<number>(0)
  const [refreshingQR, setRefreshingQR] = useState(false)
  
  // Form para nova instância
  const [newInstance, setNewInstance] = useState({
    nome: '',
    instance_name: ''
  })

  // Carregar instâncias
  const loadInstancias = async () => {
    if (connectionStatus !== 'success') {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/evolution/instances')
      if (!response.ok) throw new Error('Erro ao carregar instâncias')
      
      const data = await response.json()
      console.log('Dados recebidos da API:', data)
      setInstancias(data.instancias || [])
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar instâncias",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Criar nova instância
  const createInstance = async () => {
    if (!newInstance.nome || !newInstance.instance_name) {
      toast({
        title: "Erro",
        description: "Nome e nome técnico são obrigatórios",
        variant: "destructive"
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/evolution/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInstance)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Instância criada com sucesso!"
        })
        setNewInstance({ nome: '', instance_name: '' })
        await loadInstancias()
      } else {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar instância",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  // Buscar QR Code (função reutilizável)
  const fetchQRCode = async (instanceName: string, silent: boolean = false) => {
    try {
      if (!silent) setRefreshingQR(true)
      
      const response = await fetch(`/api/evolution/instances/${instanceName}`)
      if (!response.ok) throw new Error('Erro ao buscar QR Code')
      
      const data = await response.json()
      console.log('Resposta da API para QR Code:', data)
      
      if (data.instance.qr_code) {
        // Verificar se o qr_code é um objeto ou string
        let qrCodeBase64 = ''
        
        if (typeof data.instance.qr_code === 'string') {
          // Se for string, usar diretamente
          qrCodeBase64 = data.instance.qr_code
        } else if (data.instance.qr_code.base64) {
          // Se for objeto com propriedade base64
          qrCodeBase64 = data.instance.qr_code.base64
      } else {
          console.error('Formato de QR Code não reconhecido:', data.instance.qr_code)
          throw new Error('Formato de QR Code inválido')
        }
        
        // Verificar se é uma URL base64 válida
        if (!qrCodeBase64.startsWith('data:image')) {
          qrCodeBase64 = `data:image/png;base64,${qrCodeBase64}`
        }
        
        setSelectedQR(qrCodeBase64)
        
        // Resetar countdown
        setQrCountdown(30) // 30 segundos até próximo refresh
        
        return true
      } else {
        if (!silent) {
        toast({
          title: "Aviso",
          description: "QR Code não disponível para esta instância",
          variant: "destructive"
        })
      }
        return false
      }
    } catch (error: any) {
      console.error('Erro ao obter QR Code:', error)
      if (!silent) {
      toast({
        title: "Erro",
          description: error.message || "Falha ao obter QR Code",
        variant: "destructive"
      })
      }
      return false
    } finally {
      if (!silent) setRefreshingQR(false)
    }
  }

  // Mostrar QR Code e iniciar auto-refresh
  const showQRCode = async (instanceName: string) => {
    setSelectedInstance(instanceName)
    setQrModalOpen(true)
    
    // Buscar QR Code inicial
    const success = await fetchQRCode(instanceName)
    
    if (success) {
      // Iniciar sistema de auto-refresh
      startQRRefresh(instanceName)
    }
  }

  // Iniciar sistema de auto-refresh do QR Code
  const startQRRefresh = (instanceName: string) => {
    // Limpar qualquer interval anterior
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval)
    }

    let qrRefreshCounter = 30 // Contador para refresh do QR Code
    let statusCheckCounter = 0 // Contador para verificação de status

    // Timer principal (atualizar a cada segundo)
    const mainTimer = setInterval(async () => {
      // Atualizar countdown visual
      setQrCountdown(qrRefreshCounter)
      
      // Verificar status a cada 3 segundos
      statusCheckCounter++
      if (statusCheckCounter >= 3) {
        statusCheckCounter = 0
        
        try {
          console.log(`🔍 Verificando se instância ${instanceName} foi conectada...`)
          
          // Buscar status atual da instância
          const response = await fetch(`/api/evolution/instances/${instanceName}`)
          if (response.ok) {
            const data = await response.json()
            const currentStatus = data.instance?.status
            
            console.log(`📊 Status atual da instância ${instanceName}: ${currentStatus}`)
            
            // Se a instância foi conectada, fechar modal e atualizar lista
            if (currentStatus === 'conectada' || currentStatus === 'open') {
              console.log(`✅ Instância ${instanceName} conectada! Fechando modal...`)
              
              // Parar o timer
              clearInterval(mainTimer)
              setQrRefreshInterval(null)
              setQrCountdown(0)
              
              // Fechar modal
              setQrModalOpen(false)
              setSelectedQR('')
              setSelectedInstance('')
              
              // Atualizar lista de instâncias
              await loadInstancias()
              
              // Mostrar notificação de sucesso
              toast({
                title: "✅ WhatsApp Conectado!",
                description: `A instância "${instanceName}" foi conectada com sucesso.`,
                duration: 5000
              })
              
              return // Sair da função
            }
          }
        } catch (error) {
          console.log(`❌ Erro ao verificar status da instância ${instanceName}:`, error)
        }
      }
      
      // Countdown para refresh do QR Code
      qrRefreshCounter--
      if (qrRefreshCounter <= 0) {
        // Quando chegar a 0, buscar novo QR Code
        console.log(`🔄 Atualizando QR Code da instância ${instanceName}...`)
        fetchQRCode(instanceName, true)
        qrRefreshCounter = 30 // Resetar para 30 segundos
      }
    }, 1000)

    setQrRefreshInterval(mainTimer)
  }

  // Parar auto-refresh
  const stopQRRefresh = () => {
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval)
      setQrRefreshInterval(null)
    }
    setQrCountdown(0)
  }

  // Refresh manual do QR Code
  const refreshQRCodeManually = () => {
    if (selectedInstance) {
      fetchQRCode(selectedInstance)
      // Reiniciar o timer
      startQRRefresh(selectedInstance)
    }
  }

  // Ações na instância
  const handleInstanceAction = async (instanceName: string, action: 'restart' | 'logout' | 'delete' | 'connect' | 'set_default') => {
    try {
      let response
      
      if (action === 'delete') {
        response = await fetch(`/api/evolution/instances/${instanceName}`, {
          method: 'DELETE'
        })
      } else if (action === 'set_default') {
        response = await fetch(`/api/evolution/instances/${instanceName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_default' })
        })
        // Recarregar instâncias após definir padrão
        await loadInstancias()
      } else {
        response = await fetch(`/api/evolution/instances/${instanceName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        })
      }
      
      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: result.message
        })
        // Para outras ações, recarregar instâncias se necessário
        if (action !== 'set_default') {
          await loadInstancias()
        }
      } else {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao executar ação",
        variant: "destructive"
      })
    }
  }

  // Status helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'conectada':
      case 'open': return 'bg-green-600'
      case 'desconectada':
      case 'close': return 'bg-red-600'
      case 'criando':
      case 'connecting': return 'bg-yellow-600'
      case 'erro': return 'bg-red-800'
      default: return 'bg-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'conectada':
      case 'open': return <Wifi className="h-4 w-4" />
      case 'desconectada':
      case 'close': return <WifiOff className="h-4 w-4" />
      case 'criando':
      case 'connecting': return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'erro': return <AlertTriangle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  // Traduzir status da Evolution API para português
  const translateStatus = (status: string) => {
    switch (status) {
      case 'open': return 'conectada'
      case 'close': return 'desconectada'
      case 'connecting': return 'conectando'
      case 'creating': return 'criando'
      default: return status
    }
  }

  useEffect(() => {
    loadInstancias()
    // Atualizar a cada 10 segundos se conectado
    if (connectionStatus === 'success') {
      const interval = setInterval(loadInstancias, 10000)
      return () => clearInterval(interval)
    }
  }, [connectionStatus])

  // Limpar timer do QR Code quando modal for fechado
  useEffect(() => {
    if (!qrModalOpen) {
      stopQRRefresh()
      setSelectedQR('')
      setSelectedInstance('')
    }
  }, [qrModalOpen])

  // Cleanup quando componente for desmontado
  useEffect(() => {
    return () => {
      if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval)
      }
    }
  }, [])

  // Se não estiver conectado, mostrar aviso
  if (connectionStatus !== 'success') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Configuração Necessária</span>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          Configure e teste a conexão com a Evolution API antes de gerenciar instâncias.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-6 border-t pt-6">
      {/* Header com botão de criar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Instâncias WhatsApp
          </h3>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadInstancias}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância</DialogTitle>
                <DialogDescription>
                  Crie uma nova instância WhatsApp para envio de mensagens
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Instância</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: WhatsApp Principal"
                    value={newInstance.nome}
                    onChange={(e) => setNewInstance(prev => ({
                      ...prev,
                      nome: e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instance_name">Nome Técnico</Label>
                  <Input
                    id="instance_name"
                    placeholder="Ex: whatsapp_principal"
                    value={newInstance.instance_name}
                    onChange={(e) => setNewInstance(prev => ({
                      ...prev,
                      instance_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                    }))}
                  />
                  <p className="text-sm text-gray-500">
                    Apenas letras minúsculas, números e underscore
                  </p>
                </div>
                <Button
                  onClick={createInstance}
                  disabled={creating}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {creating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {creating ? 'Criando...' : 'Criar Instância'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de Instâncias */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : instancias.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {instancias.map((instancia) => (
            <Card key={instancia.id} className="border-0 bg-white/80 dark:bg-gray-800/80">
              <CardHeader className={`${getStatusColor(instancia.status)} text-white pb-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5" />
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {instancia.nome}
                        {instancia.is_default && (
                          <div className="flex items-center gap-1 cursor-pointer group" onClick={() => handleUnsetDefault(instancia.instance_name)} title="Remover como padrão">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 group-hover:fill-gray-200 group-hover:text-gray-200 transition" />
                            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                              Padrão para notificações
                            </Badge>
                          </div>
                        )}
                      </CardTitle>
                      <p className="text-sm opacity-90">@{instancia.instance_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(instancia.status)}
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      {translateStatus(instancia.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <p>Criada: {new Date(instancia.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {(instancia.status === 'desconectada' || instancia.status === 'close' || instancia.status === 'criando' || instancia.status === 'creating') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInstanceAction(instancia.instance_name, 'connect')}
                          className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <Wifi className="h-3 w-3 mr-1" />
                          Conectar
                        </Button>
                    )}
                    
                    {!instancia.is_default && (instancia.status === 'conectada' || instancia.status === 'open') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInstanceAction(instancia.instance_name, 'set_default')}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Definir como Padrão
                        </Button>
                    )}
                    
                        <Button
                          size="sm"
                          variant="outline"
                      onClick={() => handleInstanceAction(instancia.instance_name, 'restart')}
                      className="text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                        >
                      <Power className="h-3 w-3 mr-1" />
                      Reiniciar
                        </Button>
                    
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInstanceAction(instancia.instance_name, 'logout')}
                        className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        Desconectar
                      </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInstanceAction(instancia.instance_name, 'delete')}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-8">
            <div className="text-center">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma instância encontrada
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Crie sua primeira instância WhatsApp para começar a enviar mensagens
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Instância
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Instância</DialogTitle>
                    <DialogDescription>
                      Crie uma nova instância WhatsApp para envio de mensagens
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome da Instância</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: WhatsApp Principal"
                        value={newInstance.nome}
                        onChange={(e) => setNewInstance(prev => ({
                          ...prev,
                          nome: e.target.value
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instance_name">Nome Técnico</Label>
                      <Input
                        id="instance_name"
                        placeholder="Ex: whatsapp_principal"
                        value={newInstance.instance_name}
                        onChange={(e) => setNewInstance(prev => ({
                          ...prev,
                          instance_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                        }))}
                      />
                      <p className="text-sm text-gray-500">
                        Apenas letras minúsculas, números e underscore
                      </p>
                    </div>
                    <Button
                      onClick={createInstance}
                      disabled={creating}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {creating ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {creating ? 'Criando...' : 'Criar Instância'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal QR Code */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>QR Code - {selectedInstance}</span>
              {qrCountdown > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Auto-refresh em {qrCountdown}s
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Escaneie este QR Code com o WhatsApp para conectar a instância. 
              O código é atualizado automaticamente a cada 30 segundos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {selectedQR ? (
              <>
                <div className="relative">
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    <img 
                      src={selectedQR} 
                      alt={`QR Code para conectar a instância ${selectedInstance}`}
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                  {refreshingQR && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                  )}
                </div>
                
                {/* Botão de refresh manual */}
                        <Button
                  onClick={refreshQRCodeManually}
                  variant="outline"
                  size="sm"
                  disabled={refreshingQR}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  {refreshingQR ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar QR Code
                </Button>
                
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600 font-medium">
                    Como conectar:
                  </p>
                  <p className="text-sm text-gray-600">
                    1. Abra o WhatsApp no seu celular
                  </p>
                  <p className="text-sm text-gray-600">
                    2. Vá em Menu → Dispositivos conectados
                  </p>
                  <p className="text-sm text-gray-600">
                    3. Toque em "Conectar um dispositivo"
                  </p>
                  <p className="text-sm text-gray-600">
                    4. Aponte a câmera para este QR Code
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
                <p className="text-sm text-gray-600">Carregando QR Code...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente independente para gerenciamento de instâncias (sem dependência de connectionStatus)
function IndependentInstancesManager() {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedQR, setSelectedQR] = useState<string>('')
  const [selectedInstance, setSelectedInstance] = useState<string>('')
  const [qrRefreshInterval, setQrRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [qrCountdown, setQrCountdown] = useState<number>(0)
  const [refreshingQR, setRefreshingQR] = useState(false)
  
  // Form para nova instância
  const [newInstance, setNewInstance] = useState({
    nome: '',
    instance_name: ''
  })

  // Estado de configuração da Evolution API
  const [evolutionConfigured, setEvolutionConfigured] = useState(false)
  const [configError, setConfigError] = useState<string>('')
  const [recheckingConfig, setRecheckingConfig] = useState(false)

  useEffect(() => {
    checkEvolutionConfig()
    
    // Auto-refresh das instâncias a cada 10 segundos se configurado
    const intervalId = setInterval(() => {
      if (evolutionConfigured) {
        loadInstancias()
      }
    }, 10000)

    return () => clearInterval(intervalId)
  }, [evolutionConfigured])

  // Limpar timer do QR Code quando modal for fechado
  useEffect(() => {
    if (!qrModalOpen) {
      stopQRRefresh()
      setSelectedQR('')
      setSelectedInstance('')
    }
  }, [qrModalOpen])

  // Cleanup quando componente for desmontado
  useEffect(() => {
    return () => {
      if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval)
      }
    }
  }, [qrRefreshInterval])

  const checkEvolutionConfig = async () => {
    try {
      setConfigError('')
      
      const response = await fetch('/api/evolution/config')
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Dados de configuração Evolution:', data)
      
      // Usar o campo 'configured' que a API já calcula
      if (data.configured === true) {
        console.log('✅ Evolution API configurada, carregando instâncias...')
        setEvolutionConfigured(true)
        setConfigError('')
        await loadInstancias()
      } else {
        console.log('❌ Evolution API não configurada')
        setEvolutionConfigured(false)
        setConfigError('Evolution API não está configurada ou não está respondendo')
        setLoading(false)
      }
    } catch (error: any) {
      console.error('❌ Erro ao verificar configurações Evolution:', error)
      setEvolutionConfigured(false)
      setConfigError(`Erro ao verificar configurações: ${error.message}`)
      setLoading(false)
    }
  }

  // Carregar instâncias
  const loadInstancias = async () => {
    if (!evolutionConfigured) return
    
    try {
      console.log('🔄 Carregando instâncias...')
      const response = await fetch('/api/evolution/instances')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar instâncias')
      }
      
      const data = await response.json()
              console.log('✅ Instâncias carregadas:', data.instancias?.length || 0)
      
      setInstancias(data.instancias || [])
      setConfigError('')
    } catch (error: any) {
      console.error('❌ Erro ao carregar instâncias:', error)
      
      // Se erro ao carregar instâncias, pode ser problema de configuração
      if (error.message.includes('401') || error.message.includes('403')) {
        setConfigError('Erro de autenticação - verifique a API Key')
        setEvolutionConfigured(false)
      } else {
        toast({
          title: "Erro",
          description: "Falha ao carregar instâncias",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Buscar QR Code (função reutilizável)
  const fetchQRCode = async (instanceName: string, silent: boolean = false) => {
    try {
      if (!silent) setRefreshingQR(true)
      
      const response = await fetch(`/api/evolution/instances/${instanceName}`)
      if (!response.ok) throw new Error('Erro ao buscar QR Code')
      
      const data = await response.json()
      console.log('Resposta da API para QR Code:', data)
      
      if (data.instance.qr_code) {
        // Verificar se o qr_code é um objeto ou string
        let qrCodeBase64 = ''
        
        if (typeof data.instance.qr_code === 'string') {
          // Se for string, usar diretamente
          qrCodeBase64 = data.instance.qr_code
        } else if (data.instance.qr_code.base64) {
          // Se for objeto com propriedade base64
          qrCodeBase64 = data.instance.qr_code.base64
        } else {
          console.error('Formato de QR Code não reconhecido:', data.instance.qr_code)
          throw new Error('Formato de QR Code inválido')
        }
        
        // Verificar se é uma URL base64 válida
        if (!qrCodeBase64.startsWith('data:image')) {
          qrCodeBase64 = `data:image/png;base64,${qrCodeBase64}`
        }
        
        setSelectedQR(qrCodeBase64)
        
        // Resetar countdown
        setQrCountdown(30) // 30 segundos até próximo refresh
        
        return true
      } else {
        if (!silent) {
          toast({
            title: "Aviso",
            description: "QR Code não disponível para esta instância",
            variant: "destructive"
          })
        }
        return false
      }
    } catch (error: any) {
      console.error('Erro ao obter QR Code:', error)
      if (!silent) {
        toast({
          title: "Erro",
          description: error.message || "Falha ao obter QR Code",
          variant: "destructive"
        })
      }
      return false
    } finally {
      if (!silent) setRefreshingQR(false)
    }
  }

  // Mostrar QR Code e iniciar auto-refresh
  const showQRCode = async (instanceName: string) => {
    setSelectedInstance(instanceName)
    setQrModalOpen(true)
    
    // Buscar QR Code inicial
    const success = await fetchQRCode(instanceName)
    
    if (success) {
      // Iniciar sistema de auto-refresh
      startQRRefresh(instanceName)
    }
  }

  // Iniciar sistema de auto-refresh do QR Code
  const startQRRefresh = (instanceName: string) => {
    // Limpar qualquer interval anterior
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval)
    }

    let qrRefreshCounter = 30 // Contador para refresh do QR Code
    let statusCheckCounter = 0 // Contador para verificação de status

    // Timer principal (atualizar a cada segundo)
    const mainTimer = setInterval(async () => {
      // Atualizar countdown visual
      setQrCountdown(qrRefreshCounter)
      
      // Verificar status a cada 3 segundos
      statusCheckCounter++
      if (statusCheckCounter >= 3) {
        statusCheckCounter = 0
        
        try {
          console.log(`🔍 Verificando se instância ${instanceName} foi conectada...`)
          
          // Buscar status atual da instância
          const response = await fetch(`/api/evolution/instances/${instanceName}`)
          if (response.ok) {
            const data = await response.json()
            const currentStatus = data.instance?.status
            
            console.log(`📊 Status atual da instância ${instanceName}: ${currentStatus}`)
            
            // Se a instância foi conectada, fechar modal e atualizar lista
            if (currentStatus === 'conectada' || currentStatus === 'open') {
              console.log(`✅ Instância ${instanceName} conectada! Fechando modal...`)
              
              // Parar o timer
              clearInterval(mainTimer)
              setQrRefreshInterval(null)
              setQrCountdown(0)
              
              // Fechar modal
              setQrModalOpen(false)
              setSelectedQR('')
              setSelectedInstance('')
              
              // Atualizar lista de instâncias
              await loadInstancias()
              
              // Mostrar notificação de sucesso
              toast({
                title: "✅ WhatsApp Conectado!",
                description: `A instância "${instanceName}" foi conectada com sucesso.`,
                duration: 5000
              })
              
              return // Sair da função
            }
          }
        } catch (error) {
          console.log(`❌ Erro ao verificar status da instância ${instanceName}:`, error)
        }
      }
      
      // Countdown para refresh do QR Code
      qrRefreshCounter--
      if (qrRefreshCounter <= 0) {
        // Quando chegar a 0, buscar novo QR Code
        console.log(`🔄 Atualizando QR Code da instância ${instanceName}...`)
        fetchQRCode(instanceName, true)
        qrRefreshCounter = 30 // Resetar para 30 segundos
      }
    }, 1000)

    setQrRefreshInterval(mainTimer)
  }

  // Parar auto-refresh
  const stopQRRefresh = () => {
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval)
      setQrRefreshInterval(null)
    }
    setQrCountdown(0)
  }

  // Refresh manual do QR Code
  const refreshQRCodeManually = () => {
    if (selectedInstance) {
      fetchQRCode(selectedInstance)
      // Reiniciar o timer
      startQRRefresh(selectedInstance)
    }
  }

  // Criar nova instância
  const createInstance = async () => {
    if (!newInstance.nome || !newInstance.instance_name) {
      toast({
        title: "Erro",
        description: "Nome e nome técnico são obrigatórios",
        variant: "destructive"
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/evolution/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInstance)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Instância criada com sucesso!"
        })
        setNewInstance({ nome: '', instance_name: '' })
        await loadInstancias()
      } else {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar instância",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  // Ações na instância
  const handleInstanceAction = async (instanceName: string, action: 'restart' | 'logout' | 'delete' | 'connect' | 'set_default') => {
    try {
      let response
      
      if (action === 'delete') {
        response = await fetch(`/api/evolution/instances/${instanceName}`, {
          method: 'DELETE'
        })
      } else if (action === 'set_default') {
        response = await fetch(`/api/evolution/instances/${instanceName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_default' })
        })
        // Recarregar instâncias após definir padrão
        await loadInstancias()
      } else {
        response = await fetch(`/api/evolution/instances/${instanceName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        })
      }
      
      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: result.message
        })
        // Para outras ações, recarregar instâncias se necessário
        if (action !== 'set_default') {
          await loadInstancias()
        }
      } else {
        toast({
          title: "Erro",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao executar ação",
        variant: "destructive"
      })
    }
  }

  // Status helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'conectada':
      case 'open': return 'bg-green-600'
      case 'desconectada':
      case 'close': return 'bg-red-600'
      case 'criando':
      case 'connecting': return 'bg-yellow-600'
      case 'erro': return 'bg-red-800'
      default: return 'bg-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'conectada':
      case 'open': return <Wifi className="h-4 w-4" />
      case 'desconectada':
      case 'close': return <WifiOff className="h-4 w-4" />
      case 'criando':
      case 'connecting': return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'erro': return <AlertTriangle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  // Traduzir status da Evolution API para português
  const translateStatus = (status: string) => {
    switch (status) {
      case 'open': return 'conectada'
      case 'close': return 'desconectada'
      case 'connecting': return 'conectando'
      case 'creating': return 'criando'
      default: return status
    }
  }

  // Adicionar ação para remover padrão
  const handleUnsetDefault = async (instanceName: string) => {
    try {
      const response = await fetch(`/api/evolution/instances/${instanceName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unset_default' })
      })
      const result = await response.json()
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Instância removida como padrão"
        })
        await loadInstancias()
      } else {
        toast({
          title: "Erro",
          description: result.error || 'Erro ao remover padrão',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover padrão",
        variant: 'destructive'
      })
    }
  }

  // Se não estiver configurado
  if (!evolutionConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-center gap-3 text-amber-800 mb-4">
          <AlertTriangle className="h-6 w-6" />
          <span className="font-medium text-lg">Evolution API não configurada</span>
        </div>
        
        {configError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 font-medium mb-2">❌ Erro detectado:</p>
            <p className="text-red-600 text-sm">{configError}</p>
          </div>
        ) : (
          <p className="text-amber-700 mb-4">
            Antes de gerenciar instâncias WhatsApp, você precisa configurar a Evolution API.
          </p>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-700 font-medium mb-2">🔧 Como configurar:</p>
          <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
            <li>Vá para a aba <strong>"WhatsApp"</strong></li>
            <li>Configure a URL da Evolution API (ex: https://evo.qpainel.com.br)</li>
            <li>Configure a API Key global</li>
            <li>Clique em <strong>"Salvar Configurações"</strong></li>
            <li>Volte para esta aba para ver suas instâncias</li>
          </ol>
        </div>
        
        <div className="flex gap-2">
                    <Button
            onClick={() => {
              setRecheckingConfig(true)
              checkEvolutionConfig().finally(() => setRecheckingConfig(false))
            }}
            variant="outline"
            size="sm"
            disabled={loading || recheckingConfig}
            className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
          >
            {(loading || recheckingConfig) ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Verificar Novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de criar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Instâncias WhatsApp
          </h3>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadInstancias}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância</DialogTitle>
                <DialogDescription>
                  Crie uma nova instância WhatsApp para envio de mensagens
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Instância</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: WhatsApp Principal"
                    value={newInstance.nome}
                    onChange={(e) => setNewInstance(prev => ({
                      ...prev,
                      nome: e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instance_name">Nome Técnico</Label>
                  <Input
                    id="instance_name"
                    placeholder="Ex: whatsapp_principal"
                    value={newInstance.instance_name}
                    onChange={(e) => setNewInstance(prev => ({
                      ...prev,
                      instance_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                    }))}
                  />
                  <p className="text-sm text-gray-500">
                    Apenas letras minúsculas, números e underscore
                  </p>
                </div>
                <Button
                  onClick={createInstance}
                  disabled={creating}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {creating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {creating ? 'Criando...' : 'Criar Instância'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de Instâncias */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : instancias.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {instancias.map((instancia) => (
            <Card key={instancia.id} className="border-0 bg-white/80 dark:bg-gray-800/80">
              <CardHeader className={`${getStatusColor(instancia.status)} text-white pb-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5" />
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {instancia.nome}
                        {instancia.is_default && (
                          <div className="flex items-center gap-1 cursor-pointer group" onClick={() => handleUnsetDefault(instancia.instance_name)} title="Remover como padrão">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 group-hover:fill-gray-200 group-hover:text-gray-200 transition" />
                            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                              Padrão para notificações
                            </Badge>
                          </div>
                        )}
                      </CardTitle>
                      <p className="text-sm opacity-90">@{instancia.instance_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(instancia.status)}
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      {translateStatus(instancia.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <p>Criada: {new Date(instancia.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {(instancia.status === 'desconectada' || instancia.status === 'close' || instancia.status === 'criando' || instancia.status === 'creating') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInstanceAction(instancia.instance_name, 'connect')}
                          className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <Wifi className="h-3 w-3 mr-1" />
                          Conectar
                        </Button>
                    )}
                    
                    {!instancia.is_default && (instancia.status === 'conectada' || instancia.status === 'open') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInstanceAction(instancia.instance_name, 'set_default')}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Definir como Padrão
                        </Button>
                    )}
                    
                        <Button
                          size="sm"
                          variant="outline"
                      onClick={() => handleInstanceAction(instancia.instance_name, 'restart')}
                      className="text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                        >
                      <Power className="h-3 w-3 mr-1" />
                      Reiniciar
                        </Button>
                    
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInstanceAction(instancia.instance_name, 'logout')}
                        className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        Desconectar
                      </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInstanceAction(instancia.instance_name, 'delete')}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-8">
            <div className="text-center">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma instância encontrada
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Crie sua primeira instância WhatsApp para começar a enviar mensagens
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Instância
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Instância</DialogTitle>
                    <DialogDescription>
                      Crie uma nova instância WhatsApp para envio de mensagens
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome da Instância</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: WhatsApp Principal"
                        value={newInstance.nome}
                        onChange={(e) => setNewInstance(prev => ({
                          ...prev,
                          nome: e.target.value
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instance_name">Nome Técnico</Label>
                      <Input
                        id="instance_name"
                        placeholder="Ex: whatsapp_principal"
                        value={newInstance.instance_name}
                        onChange={(e) => setNewInstance(prev => ({
                          ...prev,
                          instance_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                        }))}
                      />
                      <p className="text-sm text-gray-500">
                        Apenas letras minúsculas, números e underscore
                      </p>
                    </div>
                    <Button
                      onClick={createInstance}
                      disabled={creating}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {creating ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {creating ? 'Criando...' : 'Criar Instância'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal QR Code */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>QR Code - {selectedInstance}</span>
              {qrCountdown > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Auto-refresh em {qrCountdown}s
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Escaneie este QR Code com o WhatsApp para conectar a instância. 
              O código é atualizado automaticamente a cada 30 segundos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {selectedQR ? (
              <>
                <div className="relative">
                  <div className="bg-white p-4 rounded-lg shadow-lg">
                    <img 
                      src={selectedQR} 
                      alt={`QR Code para conectar a instância ${selectedInstance}`}
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                  {refreshingQR && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                      <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                  )}
                </div>
                
                {/* Botão de refresh manual */}
                        <Button
                  onClick={refreshQRCodeManually}
                  variant="outline"
                  size="sm"
                  disabled={refreshingQR}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  {refreshingQR ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar QR Code
                </Button>
                
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600 font-medium">
                    Como conectar:
                  </p>
                  <p className="text-sm text-gray-600">
                    1. Abra o WhatsApp no seu celular
                  </p>
                  <p className="text-sm text-gray-600">
                    2. Vá em Menu → Dispositivos conectados
                  </p>
                  <p className="text-sm text-gray-600">
                    3. Toque em "Conectar um dispositivo"
                  </p>
                  <p className="text-sm text-gray-600">
                    4. Aponte a câmera para este QR Code
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
                <p className="text-sm text-gray-600">Carregando QR Code...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([])
  const [notificacaoHorario, setNotificacaoHorario] = useState('08:00')
  
  // Configurações básicas
  const [nomeSistema, setNomeSistema] = useState('')
  const [adminNome, setAdminNome] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false)
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)
  const [uploading, setUploading] = useState<'favicon' | 'logo' | null>(null)
  
  // Configurações Evolution API
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("")
  const [evolutionApiKey, setEvolutionApiKey] = useState("")
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const [evolutionConfig, setEvolutionConfig] = useState<EvolutionConfig>({
    apiUrl: '',
    apiKey: '',
    instanceName: ''
  })

  // Função para carregar configurações
  const fetchConfiguracoes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/configuracoes')
      const data = await response.json()
      
      if (response.ok && Array.isArray(data)) {
        const configs = data
        setConfiguracoes(configs)
        
        // Carregar configurações básicas
        const nomeSistemaConfig = configs.find((c: Configuracao) => c.chave === 'nome_sistema')
        const faviconConfig = configs.find((c: Configuracao) => c.chave === 'favicon_url')
        const logoConfig = configs.find((c: Configuracao) => c.chave === 'logo_url')
        const notificacaoHorarioConfig = configs.find((c: Configuracao) => c.chave === 'notificacao_horario')
        
        if (nomeSistemaConfig) setNomeSistema(nomeSistemaConfig.valor)
        if (faviconConfig) setFaviconUrl(faviconConfig.valor)
        if (logoConfig) setLogoUrl(logoConfig.valor)
        if (notificacaoHorarioConfig) setNotificacaoHorario(notificacaoHorarioConfig.valor)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configurações',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfiguracoes()
  }, [])

  const handleSaveSystemConfig = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          configuracoes: [
            { chave: 'nome_sistema', valor: nomeSistema },
            { chave: 'favicon_url', valor: faviconUrl },
            { chave: 'logo_url', valor: logoUrl },
            { chave: 'notificacao_horario', valor: notificacaoHorario }
          ]
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // **FORÇAR ATUALIZAÇÃO IMEDIATA**
        // Atualizar localStorage imediatamente
        if (typeof window !== 'undefined') {
          localStorage.setItem('config_nome_sistema', nomeSistema)
          localStorage.setItem('config_favicon_url', faviconUrl)
          localStorage.setItem('config_logo_url', logoUrl)
          localStorage.removeItem('config_last_fetch') // Forçar nova busca na próxima vez
          
          // Atualizar título da página imediatamente
          document.title = nomeSistema
        }
        
        toast({
          title: 'Configurações salvas com sucesso!',
          description: 'As configurações do sistema foram atualizadas.',
          duration: 3000
        })
        
        // Recarregar as configurações para atualizar a interface
        fetchConfiguracoes()
        
        // **FORCE REFRESH DO COMPONENTE CONFIG PROVIDER**
        // Disparar evento personalizado para forçar atualização
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('forceConfigRefresh', {
            detail: { nomeSistema, faviconUrl, logoUrl }
          }))
        }
      } else {
        throw new Error(data.error || 'Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        title: 'Erro ao salvar configurações',
        description: 'Ocorreu um erro ao tentar salvar as configurações do sistema.',
        variant: 'destructive',
        duration: 3000
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!senhaAtual) {
      toast({
        title: "Erro",
        description: "Senha atual é obrigatória",
        variant: "destructive"
      })
      return
    }

    if (novaSenha !== confirmarSenha) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      })
      return
    }

    if (novaSenha.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      // Primeiro, verificar se a senha atual está correta
      const verifyResponse = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: senhaAtual
        })
      })

      const verifyResult = await verifyResponse.json()

      if (!verifyResponse.ok) {
        throw new Error(verifyResult.error || 'Erro ao verificar senha atual')
      }

      if (!verifyResult.valid) {
        toast({
          title: "Erro",
          description: "Senha atual incorreta",
          variant: "destructive"
        })
        return
      }

      // Se a senha atual estiver correta, proceder com a alteração
      const response = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configuracoes: [
            { chave: 'admin_password', valor: novaSenha }
          ]
        })
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Senha alterada com sucesso",
        })
        setSenhaAtual("")
        setNovaSenha("")
        setConfirmarSenha("")
      } else {
        throw new Error('Erro ao alterar senha')
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao alterar senha",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File, tipo: 'favicon' | 'logo') => {
    setUploading(tipo)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tipo', tipo)

      const response = await fetch('/api/configuracoes/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Sucesso",
          description: data.message,
        })
        
        // **ATUALIZAÇÃO IMEDIATA**
        // Atualizar URL no estado local
        if (tipo === 'favicon') {
          setFaviconUrl(data.url)
          // Atualizar localStorage imediatamente
          if (typeof window !== 'undefined') {
            localStorage.setItem('config_favicon_url', data.url)
          }
        } else {
          setLogoUrl(data.url)
          // Atualizar localStorage imediatamente
          if (typeof window !== 'undefined') {
            localStorage.setItem('config_logo_url', data.url)
          }
        }
        
        // **DISPARAR EVENTO PARA ATUALIZAR TODOS OS COMPONENTES**
        if (typeof window !== 'undefined') {
          localStorage.removeItem('config_last_fetch') // Forçar nova busca
          console.log('🚀 Disparando evento forceConfigRefresh após upload', { tipo, url: data.url })
          window.dispatchEvent(new CustomEvent('forceConfigRefresh', {
            detail: { 
              nomeSistema, 
              faviconUrl: tipo === 'favicon' ? data.url : faviconUrl,
              logoUrl: tipo === 'logo' ? data.url : logoUrl
            }
          }))
        }
        
        // Recarregar configurações para sincronizar
        fetchConfiguracoes()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Erro no upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      toast({
        title: "Erro",
        description: `Erro ao fazer upload do ${tipo}`,
        variant: "destructive"
      })
    } finally {
      setUploading(null)
    }
  }

  // Salvar configurações WhatsApp Evolution
  const handleSaveEvolutionConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configuracoes: [
            { chave: 'evolution_api_url', valor: evolutionApiUrl },
            { chave: 'evolution_api_key', valor: evolutionApiKey }
          ]
        })
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações do WhatsApp salvas com sucesso",
        })
      } else {
        throw new Error('Erro ao salvar')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Testar conexão com Evolution API
  const handleTestConnection = async () => {
    if (!evolutionApiUrl || !evolutionApiKey) {
      toast({
        title: "Erro",
        description: "Preencha URL e API Key antes de testar",
        variant: "destructive"
      })
      return
    }

    setTestingConnection(true)
    setConnectionStatus('idle')
    
    try {
      // Primeiro salvar as configurações
      const saveResponse = await fetch('/api/evolution/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evolution_api_url: evolutionApiUrl,
          evolution_api_key: evolutionApiKey
        })
      })

      if (!saveResponse.ok) {
        const saveError = await saveResponse.json()
        throw new Error(saveError.error || 'Erro ao salvar configurações')
      }

      // Depois testar a conexão
      const response = await fetch('/api/evolution/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setConnectionStatus('success')
        toast({
          title: "✅ Conexão Estabelecida",
          description: result.message + (result.details?.endpoint ? ` (${result.details.endpoint})` : ''),
        })
      } else {
        setConnectionStatus('error')
        
        let errorDescription = result.message || "Erro ao conectar com Evolution API"
        
        // Adicionar detalhes específicos do erro
        if (result.details?.suggestion) {
          errorDescription += `\n\n💡 ${result.details.suggestion}`
        }
        
        if (result.error?.status) {
          errorDescription += `\n\nStatus HTTP: ${result.error.status}`
        }
        
        if (result.error?.code === 'ECONNREFUSED') {
          errorDescription = "❌ Servidor Evolution API não está respondendo.\n\nVerifique se o servidor está online e a URL está correta."
        } else if (result.error?.status === 401) {
          errorDescription = "🔑 API Key inválida ou sem permissões.\n\nVerifique se a API Key está correta."
        } else if (result.error?.status === 404) {
          errorDescription = "🔍 Endpoint não encontrado.\n\nVerifique se a URL da Evolution API está correta."
        }
        
        toast({
          title: "Erro na Conexão",
          description: errorDescription,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error)
      setConnectionStatus('error')
      
      let errorMessage = "Erro de rede ao testar conexão"
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "❌ Erro de rede.\n\nVerifique sua conexão com a internet."
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setTestingConnection(false)
    }
  }

  // Carregar configurações da Evolution API ao montar
  useEffect(() => {
    const fetchEvolutionConfig = async () => {
      try {
        const response = await fetch('/api/evolution/config')
        if (response.ok) {
          const data = await response.json()
          if (data?.evolution_api_url) setEvolutionApiUrl(data.evolution_api_url)
          if (data?.evolution_api_key) setEvolutionApiKey(data.evolution_api_key)
        }
      } catch (err) {
        // Silencioso
      }
    }
    fetchEvolutionConfig()
  }, [])

  // Após carregar evolutionApiUrl e evolutionApiKey, testar conexão automaticamente
  useEffect(() => {
    if (evolutionApiUrl && evolutionApiKey) {
      const autoTestConnection = async () => {
        setTestingConnection(true)
        setConnectionStatus('idle')
        try {
          const response = await fetch('/api/evolution/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          const result = await response.json()
          if (response.ok && result.success) {
            setConnectionStatus('success')
          } else {
            setConnectionStatus('error')
          }
        } catch {
          setConnectionStatus('error')
        } finally {
          setTestingConnection(false)
        }
      }
      autoTestConnection()
    }
  }, [evolutionApiUrl, evolutionApiKey])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header Mobile-First Melhorado */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="rounded-full bg-blue-600/10 p-2.5 backdrop-blur-sm sm:p-3">
              <Settings className="h-5 w-5 text-blue-600 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl lg:text-3xl truncate">
                Configurações
              </h1>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:mt-1 sm:text-sm">
                Gerencie as configurações do seu sistema
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="sistema" className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Tabs Navigation - Mobile Otimizado */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto w-full min-w-max space-x-0.5 rounded-lg bg-muted/80 p-1 text-muted-foreground sm:grid sm:w-full sm:min-w-0 sm:grid-cols-4 sm:space-x-0 backdrop-blur-sm">
              <TabsTrigger 
                value="sistema" 
                className="whitespace-nowrap px-3 py-2.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
              >
                Sistema
              </TabsTrigger>
              <TabsTrigger 
                value="aparencia" 
                className="whitespace-nowrap px-3 py-2.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
              >
                Aparência
              </TabsTrigger>
              <TabsTrigger 
                value="whatsapp" 
                className="whitespace-nowrap px-3 py-2.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  WhatsApp
                  {connectionStatus === 'success' && (
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 sm:h-2 sm:w-2"></div>
                  )}
                  {connectionStatus === 'error' && (
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 sm:h-2 sm:w-2"></div>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="instancias" 
                className="whitespace-nowrap px-3 py-2.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
              >
                Instâncias
              </TabsTrigger>
        </TabsList>
          </div>

        {/* Configurações do Sistema */}
          <TabsContent value="sistema" className="space-y-3 sm:space-y-4 lg:space-y-6">
            <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-800/90 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white sm:p-5 lg:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="rounded-full bg-white/20 p-2.5 backdrop-blur-sm sm:p-3">
                    <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <CardTitle className="text-sm font-semibold sm:text-base lg:text-lg">
                    Configurações do Sistema
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <Label htmlFor="nome-sistema" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome do Sistema
                    </Label>
                    <Input
                      id="nome-sistema"
                      value={nomeSistema}
                      onChange={(e) => setNomeSistema(e.target.value)}
                      placeholder="Dashboard"
                      className="text-sm h-11 sm:h-10 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Este nome aparecerá em todas as páginas do sistema
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="notificacao-horario" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Horário de Atualização Automática
                    </Label>
                    <Input
                      id="notificacao-horario"
                      type="time"
                      value={notificacaoHorario}
                      onChange={(e) => setNotificacaoHorario(e.target.value)}
                      className="text-sm h-11 sm:h-10 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Horário em que os clientes vencidos serão atualizados automaticamente
                    </p>
                  </div>

                  <div className="flex justify-start pt-2">
                    <Button 
                      onClick={handleSaveSystemConfig}
                      disabled={saving}
                      className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto sm:min-w-[140px] h-11 sm:h-10 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      size="sm"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alterar Senha Admin */}
            <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-800/90 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white sm:p-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="rounded-full bg-white/20 p-2.5 backdrop-blur-sm sm:p-3">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <CardTitle className="text-sm font-semibold sm:text-base lg:text-lg">
                    Alterar Senha Admin
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <Label htmlFor="senha-atual" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Senha Atual
                    </Label>
                    <div className="relative">
                      <Input
                        id="senha-atual"
                        type={mostrarSenhaAtual ? "text" : "password"}
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        placeholder="Digite sua senha atual"
                        className="pr-12 text-sm h-11 sm:h-10 focus:ring-2 focus:ring-red-500/20 transition-all"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all"
                        onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                      >
                        {mostrarSenhaAtual ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="nova-senha" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nova Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="nova-senha"
                        type={mostrarNovaSenha ? "text" : "password"}
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Digite a nova senha"
                        className="pr-12 text-sm h-11 sm:h-10 focus:ring-2 focus:ring-red-500/20 transition-all"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all"
                        onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                      >
                        {mostrarNovaSenha ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="confirmar-senha" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirmar Nova Senha
                    </Label>
                    <Input
                      id="confirmar-senha"
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Confirme a nova senha"
                      className="text-sm h-11 sm:h-10 focus:ring-2 focus:ring-red-500/20 transition-all"
                    />
                  </div>

                  <div className="flex justify-start pt-2">
                    <Button 
                      onClick={handlePasswordChange}
                      disabled={saving}
                      className="w-full bg-red-600 hover:bg-red-700 sm:w-auto sm:min-w-[140px] h-11 sm:h-10 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      size="sm"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Alterando...' : 'Alterar Senha'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        {/* Configurações de Aparência */}
          <TabsContent value="aparencia" className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
              {/* Favicon */}
              <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-800/90 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 text-white sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                      <Upload className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold sm:text-base">Favicon</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                      {faviconUrl ? (
                        <img 
                          src={faviconUrl} 
                          alt="Favicon" 
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="favicon-upload" className="cursor-pointer block">
                        <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 text-center transition-all duration-200 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10">
                          <Upload className="mx-auto mb-3 h-6 w-6 text-gray-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            {uploading === 'favicon' ? 'Enviando...' : 'Clique para enviar favicon'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            PNG, ICO até 1MB
                          </p>
                        </div>
                        <Input
                          id="favicon-upload"
                          type="file"
                          accept=".ico,.png"
                          className="hidden"
                          disabled={uploading === 'favicon'}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, 'favicon')
                          }}
                        />
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logo */}
              <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-800/90 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 p-4 text-white sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                      <Upload className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold sm:text-base">Logo</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="logo-upload" className="cursor-pointer block">
                        <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 text-center transition-all duration-200 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10">
                          <Upload className="mx-auto mb-3 h-6 w-6 text-gray-400" />
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            {uploading === 'logo' ? 'Enviando...' : 'Clique para enviar logo'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG até 2MB
                          </p>
                        </div>
                        <Input
                          id="logo-upload"
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          className="hidden"
                          disabled={uploading === 'logo'}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, 'logo')
                          }}
                        />
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* WhatsApp Evolution API */}
          <TabsContent value="whatsapp" className="space-y-3 sm:space-y-4 lg:space-y-6">
            <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-800/90 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 p-4 text-white sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold sm:text-base">
                    Configurações do WhatsApp
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="evolution_api_url">URL da Evolution API</Label>
                    <Input
                      id="evolution_api_url"
                      placeholder="https://sua-api.com"
                      value={evolutionApiUrl}
                      onChange={(e) => setEvolutionApiUrl(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      URL base da sua instalação da Evolution API
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evolution_api_key">API Key</Label>
                    <Input
                      id="evolution_api_key"
                      type="password"
                      placeholder="Sua chave da API"
                      value={evolutionApiKey}
                      onChange={(e) => setEvolutionApiKey(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Chave de autenticação da Evolution API
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleSaveEvolutionConfig}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 h-11 sm:h-10 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      size="sm"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>

                    <Button 
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="bg-blue-600 hover:bg-blue-700 h-11 sm:h-10 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      size="sm"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      {testingConnection ? 'Testando...' : 'Testar Conexão'}
                    </Button>
                  </div>

                  {/* Status da conexão */}
                  {connectionStatus !== 'idle' && (
                    <div className={`rounded-xl p-4 border transition-all duration-200 ${
                      connectionStatus === 'success' 
                        ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' 
                        : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                    }`}>
                      <div className="flex items-center gap-3">
                        {connectionStatus === 'success' ? (
                          <CheckCircle className="h-5 w-5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">
                          {connectionStatus === 'success' 
                            ? 'Conexão estabelecida com sucesso!' 
                            : 'Falha na conexão. Verifique os dados.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gerenciamento de Instâncias */}
          <TabsContent value="instancias" className="space-y-3 sm:space-y-4 lg:space-y-6">
            {connectionStatus === 'success' ? (
              <WhatsAppInstancesManager connectionStatus={connectionStatus} />
            ) : (
              <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-gray-800/90 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="rounded-full bg-white/20 p-2.5 backdrop-sm sm:p-3">
                      <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold sm:text-base lg:text-lg">
                      Gerenciar Instâncias WhatsApp
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="rounded-xl bg-blue-50 p-6 text-center dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="rounded-full bg-blue-100 dark:bg-blue-800/50 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Smartphone className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-blue-900 dark:text-blue-100">
                      Configure a Evolution API primeiro
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 max-w-md mx-auto">
                      Vá para a aba "WhatsApp" e teste a conexão para gerenciar instâncias.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>


      </Tabs>
      </div>
    </div>
  )
} 