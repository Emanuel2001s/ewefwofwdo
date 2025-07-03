"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Globe, 
  Key, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface EvolutionConfig {
  evolution_api_url: string
  has_api_key: boolean
  api_key_preview: string
  configured: boolean
}

export default function EvolutionConfiguracoes() {
  const [config, setConfig] = useState<EvolutionConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown')
  
  // Form state
  const [formData, setFormData] = useState({
    evolution_api_url: '',
    evolution_api_key: ''
  })

  // Carregar configurações
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/evolution/config')
      if (!response.ok) throw new Error('Erro ao carregar configurações')
      
      const data = await response.json()
      setConfig(data)
      setFormData({
        evolution_api_url: data.evolution_api_url || '',
        evolution_api_key: '' // Não carregar a API key por segurança
      })
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Testar conexão
  const testConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/evolution/config', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        setConnectionStatus('connected')
        toast({
          title: "Sucesso",
          description: "Conexão estabelecida com sucesso!"
        })
      } else {
        setConnectionStatus('error')
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      setConnectionStatus('error')
      toast({
        title: "Erro",
        description: "Falha ao testar conexão",
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  // Salvar configurações
  const saveConfig = async () => {
    if (!formData.evolution_api_url || !formData.evolution_api_key) {
      toast({
        title: "Erro",
        description: "URL e API Key são obrigatórios",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/evolution/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso!"
        })
        await loadConfig()
        setConnectionStatus('unknown')
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
        description: "Falha ao salvar configurações",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configurações Evolution API
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure a conexão com a Evolution API v2 para envio de mensagens WhatsApp
          </p>
        </div>

        {/* Status Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="bg-gray-800 text-white">
            <CardTitle className="flex items-center gap-3">
              <Settings className="h-6 w-6" />
              Status da Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  config?.evolution_api_url 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">URL da API</div>
                  <Badge variant={config?.evolution_api_url ? "default" : "destructive"}>
                    {config?.evolution_api_url ? 'Configurada' : 'Não configurada'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  config?.has_api_key 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">API Key</div>
                  <Badge variant={config?.has_api_key ? "default" : "destructive"}>
                    {config?.has_api_key ? config.api_key_preview : 'Não configurada'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-green-100 text-green-600'
                    : connectionStatus === 'error'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {connectionStatus === 'connected' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : connectionStatus === 'error' ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">Conexão</div>
                  <Badge variant={
                    connectionStatus === 'connected' 
                      ? "default" 
                      : connectionStatus === 'error' 
                        ? "destructive" 
                        : "secondary"
                  }>
                    {connectionStatus === 'connected' 
                      ? 'Conectada' 
                      : connectionStatus === 'error' 
                        ? 'Erro' 
                        : 'Não testada'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center gap-3">
              <Settings className="h-6 w-6" />
              Configurar Evolution API
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* URL da API */}
              <div className="space-y-2">
                <Label htmlFor="api_url">URL da Evolution API</Label>
                <Input
                  id="api_url"
                  type="url"
                  placeholder="https://evo.qpainel.com.br"
                  value={formData.evolution_api_url}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    evolution_api_url: e.target.value
                  }))}
                  className="bg-white dark:bg-gray-700"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  URL base da sua instância Evolution API (ex: https://evo.qpainel.com.br)
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key Global</Label>
                <Input
                  id="api_key"
                  type="password"
                  placeholder="Digite sua API Key global"
                  value={formData.evolution_api_key}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    evolution_api_key: e.target.value
                  }))}
                  className="bg-white dark:bg-gray-700"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  API Key global configurada na sua Evolution API
                </p>
              </div>

              {/* Informações importantes */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-2">Informações importantes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>A URL deve incluir o protocolo (https://)</li>
                      <li>A API Key é a chave global configurada na Evolution API</li>
                      <li>Teste a conexão após salvar para verificar se está funcionando</li>
                      <li>Apenas o Admin Supremo tem acesso a essas configurações</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={saveConfig}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>

                <Button
                  onClick={testConnection}
                  disabled={testing || !config?.configured}
                  variant="outline"
                  className="bg-white/80 hover:bg-white/90 border-green-200"
                >
                  {testing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {testing ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 