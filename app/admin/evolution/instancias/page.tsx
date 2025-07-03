"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Smartphone, 
  Plus, 
  QrCode, 
  RefreshCw, 
  Trash2, 
  Power, 
  LogOut,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface Instancia {
  id: number
  nome: string
  instance_name: string
  status: 'criando' | 'creating' | 'desconectada' | 'close' | 'conectada' | 'open' | 'connecting' | 'conectando' | 'erro'
  qr_code?: string
  created_at: string
  updated_at: string
}

export default function InstanciasPage() {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingInstance, setCreatingInstance] = useState(false)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [newInstanceDisplayName, setNewInstanceDisplayName] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [qrCodeDialog, setQrCodeDialog] = useState<{show: boolean, instancia?: Instancia}>({show: false})

  const loadInstancias = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/evolution/instances')
      const data = await response.json()
      
      if (data.success) {
        setInstancias(data.instancias)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar instâncias",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const createInstance = async () => {
    if (!newInstanceName.trim() || !newInstanceDisplayName.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      })
      return
    }

    try {
      setCreatingInstance(true)
      const response = await fetch('/api/evolution/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: newInstanceName.trim(),
          displayName: newInstanceDisplayName.trim()
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Instância criada com sucesso"
        })
        setShowCreateDialog(false)
        setNewInstanceName('')
        setNewInstanceDisplayName('')
        loadInstancias()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Erro ao criar instância:', error)
      toast({
        title: "Erro",
        description: "Erro ao criar instância",
        variant: "destructive"
      })
    } finally {
      setCreatingInstance(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'conectada':
      case 'open':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'desconectada':
      case 'close':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'connecting':
      case 'conectando':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
      case 'erro':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'conectada':
      case 'open':
        return 'bg-green-600'
      case 'desconectada':
      case 'close':
        return 'bg-red-600'
      case 'connecting':
      case 'conectando':
        return 'bg-yellow-600'
      case 'erro':
        return 'bg-red-800'
      default:
        return 'bg-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'conectada':
      case 'open':
        return 'Conectada'
      case 'desconectada':
      case 'close':
        return 'Desconectada'
      case 'connecting':
      case 'conectando':
        return 'Conectando'
      case 'erro':
        return 'Erro'
      default:
        return status
    }
  }

  useEffect(() => {
    loadInstancias()
    
    // Auto-refresh a cada 10 segundos
    const interval = setInterval(loadInstancias, 10000)
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
              Instâncias WhatsApp
            </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Gerencie suas instâncias do WhatsApp Business
            </p>
          </div>
            <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={loadInstancias}
                disabled={loading}
                size="sm"
              variant="outline"
                className="w-full sm:w-auto"
            >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                  Nova Instância
                </Button>
              </DialogTrigger>
                <DialogContent className="mx-3 max-w-md sm:mx-auto">
                <DialogHeader>
                  <DialogTitle>Criar Nova Instância</DialogTitle>
                    <DialogDescription>
                      Crie uma nova instância WhatsApp para envio de mensagens
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="display-name">Nome da Instância</Label>
                    <Input
                        id="display-name"
                        placeholder="Ex: Atendimento Principal"
                        value={newInstanceDisplayName}
                        onChange={(e) => setNewInstanceDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="instance-name">Nome Técnico</Label>
                    <Input
                        id="instance-name"
                        placeholder="Ex: atendimento-principal"
                        value={newInstanceName}
                        onChange={(e) => setNewInstanceName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                      <p className="text-xs text-gray-500">
                        Apenas letras minúsculas, números e hífens
                    </p>
                  </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>
                  <Button
                    onClick={createInstance}
                        disabled={creatingInstance}
                        className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
                  >
                        {creatingInstance ? 'Criando...' : 'Criar Instância'}
                  </Button>
                    </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>

        {/* Grid de Instâncias Responsivo */}
        {instancias.length === 0 ? (
          <Card className="border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-gray-800/80">
            <CardContent className="p-8 text-center">
              <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Nenhuma instância encontrada
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Crie sua primeira instância WhatsApp para começar a enviar mensagens.
              </p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primera Instância
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {instancias.map((instancia) => (
              <Card key={instancia.id} className="border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-gray-800/80 overflow-hidden">
                <CardHeader className={`${getStatusColor(instancia.status)} p-3 text-white sm:p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                        <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                      <CardTitle className="text-sm font-semibold sm:text-base truncate">
                        {instancia.nome}
                      </CardTitle>
                    </div>
                      {getStatusIcon(instancia.status)}
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Status:</p>
                      <Badge 
                        className={`text-xs ${
                          instancia.status === 'conectada' || instancia.status === 'open'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : instancia.status === 'desconectada' || instancia.status === 'close'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }`}
                      >
                        {getStatusText(instancia.status)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Nome técnico:</p>
                      <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                        {instancia.instance_name}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Criada em:</p>
                      <p className="text-xs">
                        {new Date(instancia.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2 pt-2">
                      {(instancia.status === 'desconectada' || instancia.status === 'close') && (
                        <Button
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 text-xs"
                          onClick={() => setQrCodeDialog({show: true, instancia})}
                        >
                          <QrCode className="mr-1 h-3 w-3" />
                          Conectar
                        </Button>
                      )}
                      
                      {(instancia.status === 'conectada' || instancia.status === 'open') && (
                        <div className="grid grid-cols-2 gap-1">
                          <Button size="sm" variant="outline" className="text-xs">
                            <Power className="mr-1 h-3 w-3" />
                        Reiniciar
                      </Button>
                          <Button size="sm" variant="outline" className="text-xs">
                            <LogOut className="mr-1 h-3 w-3" />
                          Desconectar
                        </Button>
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant="destructive" 
                        className="w-full text-xs"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* QR Code Dialog */}
        <Dialog open={qrCodeDialog.show} onOpenChange={(open) => setQrCodeDialog({show: open})}>
          <DialogContent className="mx-3 max-w-md sm:mx-auto">
            <DialogHeader>
              <DialogTitle>Conectar Instância</DialogTitle>
              <DialogDescription>
                Escaneie o QR Code com o WhatsApp para conectar a instância
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-64 w-64 items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                {qrCodeDialog.instancia?.qr_code ? (
                    <img 
                    src={qrCodeDialog.instancia.qr_code} 
                      alt="QR Code" 
                    className="h-60 w-60 object-contain"
                    />
                ) : (
                  <div className="text-center">
                    <QrCode className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Gerando QR Code...</p>
                  </div>
                )}
                </div>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => setQrCodeDialog({show: false})}
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 