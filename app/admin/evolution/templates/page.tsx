"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ResponsiveContainer, ResponsivePageHeader, ResponsiveGrid } from '@/components/ui/responsive-container'
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2,
  MessageCircle,
  Image,
  Info,
  Check,
  X
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface Template {
  id: number
  nome: string
  tipo: 'vencimento' | 'pagamento' | 'boas_vindas' | 'manutencao' | 'personalizada'
  message_type: 'texto' | 'imagem'
  assunto?: string
  mensagem: string
  imagem_url?: string
  imagem_caption?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  
  // Filtros
  const [filters, setFilters] = useState({
    tipo: 'todos',
    message_type: 'todos',
    ativo: 'todos'
  })

  // Form para novo template
  const [newTemplate, setNewTemplate] = useState({
    nome: '',
    tipo: 'personalizada' as const,
    message_type: 'texto' as const,
    assunto: '',
    mensagem: '',
    imagem_url: '',
    imagem_caption: '',
    ativo: true
  })

  // Carregar templates
  const loadTemplates = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.tipo !== 'todos') params.append('tipo', filters.tipo)
      if (filters.message_type !== 'todos') params.append('message_type', filters.message_type)
      if (filters.ativo !== 'todos') params.append('ativo', filters.ativo)

      const response = await fetch(`/api/evolution/templates?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar templates')
      
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar templates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Criar template
  const createTemplate = async () => {
    if (!newTemplate.nome || !newTemplate.mensagem) {
      toast({
        title: "Erro",
        description: "Nome e mensagem são obrigatórios",
        variant: "destructive"
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/evolution/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Template criado com sucesso!"
        })
        setNewTemplate({
          nome: '',
          tipo: 'personalizada',
          message_type: 'texto',
          assunto: '',
          mensagem: '',
          imagem_url: '',
          imagem_caption: '',
          ativo: true
        })
        await loadTemplates()
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
        description: "Falha ao criar template",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  // Preview do template
  const previewTemplate = async (templateId: number) => {
    try {
      const response = await fetch(`/api/evolution/templates?preview=${templateId}`)
      if (!response.ok) throw new Error('Erro ao gerar preview')
      
      const data = await response.json()
      setPreviewData(data.preview)
      setPreviewOpen(true)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao gerar preview",
        variant: "destructive"
      })
    }
  }

  // Helpers
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'vencimento': return 'bg-red-100 text-red-800'
      case 'pagamento': return 'bg-green-100 text-green-800'
      case 'boas_vindas': return 'bg-blue-100 text-blue-800'
      case 'manutencao': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'vencimento': return 'Vencimento'
      case 'pagamento': return 'Pagamento'
      case 'boas_vindas': return 'Boas-vindas'
      case 'manutencao': return 'Manutenção'
      default: return 'Personalizada'
    }
  }

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    if (filters.tipo !== 'todos' && template.tipo !== filters.tipo) return false
    if (filters.message_type !== 'todos' && template.message_type !== filters.message_type) return false
    if (filters.ativo !== 'todos' && template.ativo !== (filters.ativo === 'true')) return false
    return true
  })

  useEffect(() => {
    loadTemplates()
  }, [filters])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6">
        <ResponsiveContainer size="xl">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6">
      <ResponsiveContainer size="xl">
        {/* Header Responsivo */}
        <ResponsivePageHeader 
          title="Templates de Mensagens"
          description="Crie e gerencie templates para envio automatizado"
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Template</DialogTitle>
                <DialogDescription>
                  Crie um template personalizado para envio de mensagens WhatsApp
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <ResponsiveGrid cols={{ default: 1, sm: 2 }}>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Template</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Lembrete de Vencimento"
                      value={newTemplate.nome}
                      onChange={(e) => setNewTemplate(prev => ({
                        ...prev,
                        nome: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select
                      value={newTemplate.tipo}
                      onValueChange={(value) => setNewTemplate(prev => ({
                        ...prev,
                        tipo: value as any
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vencimento">Vencimento</SelectItem>
                        <SelectItem value="pagamento">Pagamento</SelectItem>
                        <SelectItem value="boas_vindas">Boas-vindas</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="personalizada">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </ResponsiveGrid>

                <ResponsiveGrid cols={{ default: 1, sm: 2 }}>
                  <div className="space-y-2">
                    <Label htmlFor="message_type">Tipo de Mensagem</Label>
                    <Select
                      value={newTemplate.message_type}
                      onValueChange={(value) => setNewTemplate(prev => ({
                        ...prev,
                        message_type: value as any
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="texto">Texto</SelectItem>
                        <SelectItem value="imagem">Imagem com Legenda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="assunto">Assunto (Opcional)</Label>
                    <Input
                      id="assunto"
                      placeholder="Ex: Lembrete importante"
                      value={newTemplate.assunto}
                      onChange={(e) => setNewTemplate(prev => ({
                        ...prev,
                        assunto: e.target.value
                      }))}
                    />
                  </div>
                </ResponsiveGrid>

                {newTemplate.message_type === 'imagem' && (
                  <div className="space-y-2">
                    <Label htmlFor="imagem_url">URL da Imagem</Label>
                    <Input
                      id="imagem_url"
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={newTemplate.imagem_url}
                      onChange={(e) => setNewTemplate(prev => ({
                        ...prev,
                        imagem_url: e.target.value
                      }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="mensagem">
                    {newTemplate.message_type === 'imagem' ? 'Legenda da Imagem' : 'Mensagem'}
                  </Label>
                  <Textarea
                    id="mensagem"
                    placeholder="Digite sua mensagem aqui. Use {nome}, {data_vencimento}, etc."
                    value={newTemplate.mensagem}
                    onChange={(e) => setNewTemplate(prev => ({
                      ...prev,
                      mensagem: e.target.value
                    }))}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={createTemplate}
                  disabled={creating}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {creating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {creating ? 'Criando...' : 'Criar Template'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </ResponsivePageHeader>

        {/* Filtros Responsivos */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mb-6 sm:mb-8">
          <CardHeader className="bg-blue-600 text-white pb-3 sm:pb-4">
            <CardTitle className="text-sm sm:text-lg font-semibold">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ResponsiveGrid cols={{ default: 1, sm: 3 }}>
              <div className="space-y-2">
                <Label>Tipo de Template</Label>
                <Select
                  value={filters.tipo}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="vencimento">Vencimento</SelectItem>
                    <SelectItem value="pagamento">Pagamento</SelectItem>
                    <SelectItem value="boas_vindas">Boas-vindas</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="personalizada">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Mensagem</Label>
                <Select
                  value={filters.message_type}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, message_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.ativo}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, ativo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="true">Ativos</SelectItem>
                    <SelectItem value="false">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ResponsiveGrid>
          </CardContent>
        </Card>

        {/* Grid de Templates Responsivo */}
        {filteredTemplates.length > 0 ? (
          <ResponsiveGrid cols={{ default: 1, md: 2, xl: 3 }}>
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white pb-3 sm:pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm sm:text-lg font-semibold mb-2">{template.nome}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`${getTipoColor(template.tipo)} text-xs`}>
                          {getTipoLabel(template.tipo)}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                          {template.message_type === 'texto' ? (
                            <MessageCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Image className="h-3 w-3 mr-1" />
                          )}
                          {template.message_type === 'texto' ? 'Texto' : 'Imagem'}
                        </Badge>
                        <Badge variant={template.ativo ? "default" : "secondary"} className="text-xs">
                          {template.ativo ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <X className="h-3 w-3 mr-1" />
                          )}
                          {template.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Prévia da mensagem */}
                    <div>
                      <Label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Mensagem:</Label>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white mt-1 line-clamp-3">
                        {template.mensagem.length > 100 
                          ? `${template.mensagem.substring(0, 100)}...` 
                          : template.mensagem
                        }
                      </p>
                    </div>

                    {/* Informações */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Criado:</span>
                        <span className="font-medium">
                          {new Date(template.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {template.assunto && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Assunto:</span>
                          <span className="font-medium">{template.assunto}</span>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => previewTemplate(template.id)}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 w-full"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 w-full"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        ) : (
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-dashed border-2 border-gray-300">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhum template encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Crie seu primeiro template para começar a enviar mensagens personalizadas
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Template</DialogTitle>
                      <DialogDescription>
                        Crie um template personalizado para envio de mensagens WhatsApp
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <ResponsiveGrid cols={{ default: 1, sm: 2 }}>
                        <div className="space-y-2">
                          <Label htmlFor="nome">Nome do Template</Label>
                          <Input
                            id="nome"
                            placeholder="Ex: Lembrete de Vencimento"
                            value={newTemplate.nome}
                            onChange={(e) => setNewTemplate(prev => ({
                              ...prev,
                              nome: e.target.value
                            }))}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="tipo">Tipo</Label>
                          <Select
                            value={newTemplate.tipo}
                            onValueChange={(value) => setNewTemplate(prev => ({
                              ...prev,
                              tipo: value as any
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vencimento">Vencimento</SelectItem>
                              <SelectItem value="pagamento">Pagamento</SelectItem>
                              <SelectItem value="boas_vindas">Boas-vindas</SelectItem>
                              <SelectItem value="manutencao">Manutenção</SelectItem>
                              <SelectItem value="personalizada">Personalizada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </ResponsiveGrid>

                      <div className="space-y-2">
                        <Label htmlFor="mensagem">Mensagem</Label>
                        <Textarea
                          id="mensagem"
                          placeholder="Digite sua mensagem aqui. Use {nome}, {data_vencimento}, etc."
                          value={newTemplate.mensagem}
                          onChange={(e) => setNewTemplate(prev => ({
                            ...prev,
                            mensagem: e.target.value
                          }))}
                          rows={4}
                        />
                      </div>

                      <Button
                        onClick={createTemplate}
                        disabled={creating}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {creating ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        {creating ? 'Criando...' : 'Criar Template'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de Preview */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Preview do Template</DialogTitle>
              <DialogDescription>
                Visualização com dados simulados de um cliente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {previewData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-600 rounded-full">
                      <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-900 mb-2">
                        WhatsApp Message Preview
                      </div>
                      <div className="text-sm text-gray-900 whitespace-pre-wrap">
                        {previewData.mensagem_processada}
                      </div>
                      {previewData.imagem_url && (
                        <div className="mt-3">
                          <img 
                            src={previewData.imagem_url} 
                            alt="Preview da imagem" 
                            className="max-w-full h-auto rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </ResponsiveContainer>
    </div>
  )
} 