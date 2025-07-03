"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Plus, MessageCircle, Image, Type, Search, Filter, Edit2, Trash2, Eye, FileText, Calendar, User, Server, Package, Settings } from "lucide-react"


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

const TIPOS_TEMPLATE = [
  { value: 'vencimento', label: 'Vencimento', color: 'bg-red-100 text-red-800' },
  { value: 'pagamento', label: 'Pagamento', color: 'bg-green-100 text-green-800' },
  { value: 'boas_vindas', label: 'Boas Vindas', color: 'bg-blue-100 text-blue-800' },
  { value: 'manutencao', label: 'Manutenção', color: 'bg-orange-100 text-orange-800' },
  { value: 'personalizada', label: 'Personalizada', color: 'bg-purple-100 text-purple-800' }
]

const VARIAVEIS_DISPONIVEIS = [
  { categoria: 'Cliente', variaveis: [
    '{nome}', '{whatsapp}', '{usuario}', '{status}'
  ]},
  { categoria: 'Plano', variaveis: [
    '{plano}', '{valor_plano}', '{data_ativacao}', '{data_vencimento}', 
    '{dias_vencimento}', '{dias_desde_ativacao}'
  ]},
  { categoria: 'Servidor', variaveis: [
    '{servidor}'
  ]},
  { categoria: 'Sistema', variaveis: [
    '{data_atual}', '{hora_atual}', '{nome_sistema}'
  ]}
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const [filterMessageType, setFilterMessageType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
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
      setLoading(true)
      const response = await fetch('/api/evolution/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.data || [])
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar templates",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setAuthorized(true)
    loadTemplates()
  }, [])

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.mensagem.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'all' || template.tipo === filterTipo
    const matchesMessageType = filterMessageType === 'all' || template.message_type === filterMessageType
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'ativo' && template.ativo) ||
                         (filterStatus === 'inativo' && !template.ativo)
    
    return matchesSearch && matchesTipo && matchesMessageType && matchesStatus
  })

  // Salvar template
  const handleSave = async () => {
    try {
      // Validação específica por tipo de mensagem
      if (!formData.nome) {
        toast({
          title: "Erro",
          description: "Nome do template é obrigatório",
          variant: "destructive"
        })
        return
      }

      if (formData.message_type === 'texto' && !formData.mensagem) {
        toast({
          title: "Erro",
          description: "Mensagem é obrigatória para templates de texto",
          variant: "destructive"
        })
        return
      }

      if (formData.message_type === 'imagem') {
        if (!formData.imagem_url) {
          toast({
            title: "Erro",
            description: "URL da imagem é obrigatória para templates de imagem",
            variant: "destructive"
          })
          return
        }
        
        if (!formData.imagem_caption) {
          toast({
            title: "Erro",
            description: "Legenda da imagem é obrigatória para templates de imagem",
            variant: "destructive"
          })
          return
        }
      }

      const url = isEditing && selectedTemplate 
        ? `/api/evolution/templates/${selectedTemplate.id}`
        : '/api/evolution/templates'
      
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: `Template ${isEditing ? 'atualizado' : 'criado'} com sucesso`
        })
        setModalOpen(false)
        resetForm()
        loadTemplates()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.message || "Erro ao salvar template",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive"
      })
    }
  }

  // Excluir template
  const handleDelete = async (template: Template) => {
    if (!confirm(`Tem certeza que deseja excluir o template "${template.nome}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/evolution/templates/${template.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Template excluído com sucesso"
        })
        loadTemplates()
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir template",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao excluir template:', error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive"
      })
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'personalizada',
      message_type: 'texto',
      assunto: '',
      mensagem: '',
      imagem_url: '',
      imagem_caption: '',
      ativo: true
    })
    setIsEditing(false)
    setSelectedTemplate(null)
  }

  // Abrir modal para edição
  const openEditModal = (template: Template) => {
    setFormData({
      nome: template.nome,
      tipo: template.tipo,
      message_type: template.message_type,
      assunto: template.assunto || '',
      mensagem: template.mensagem,
      imagem_url: template.imagem_url || '',
      imagem_caption: template.imagem_caption || '',
      ativo: template.ativo
    })
    setSelectedTemplate(template)
    setIsEditing(true)
    setModalOpen(true)
  }

  // Abrir modal para novo template
  const openNewModal = () => {
    resetForm()
    setModalOpen(true)
  }

  // Preview template
  const openPreview = (template: Template) => {
    setSelectedTemplate(template)
    setPreviewModalOpen(true)
  }

  // Get tipo info
  const getTipoInfo = (tipo: string) => {
    return TIPOS_TEMPLATE.find(t => t.value === tipo) || TIPOS_TEMPLATE[4]
  }

  // Se não autorizado ainda, mostrar loading
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Verificando permissões...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Templates WhatsApp</h1>
            <p className="text-gray-600 dark:text-gray-300">Gerencie suas mensagens personalizadas</p>
          </div>
          <Button 
            onClick={openNewModal}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        {/* Filtros */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {TIPOS_TEMPLATE.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Select value={filterMessageType} onValueChange={setFilterMessageType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os formatos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os formatos</SelectItem>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Templates */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm animate-pulse">
                <CardHeader className="bg-gray-200 dark:bg-gray-700 h-20"></CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhum template encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {searchTerm || filterTipo !== 'all' || filterMessageType !== 'all' || filterStatus !== 'all'
                  ? 'Nenhum template corresponde aos filtros aplicados.'
                  : 'Crie seu primeiro template para começar a enviar mensagens personalizadas.'}
              </p>
              <Button onClick={openNewModal} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => {
              const tipoInfo = getTipoInfo(template.tipo)
              return (
                <Card key={template.id} className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                          {template.message_type === 'imagem' ? (
                            <Image className="h-5 w-5" />
                          ) : (
                            <Type className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{template.nome}</CardTitle>
                          {template.assunto && (
                            <p className="text-sm text-green-100">{template.assunto}</p>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={template.ativo ? "default" : "secondary"}
                        className={template.ativo ? "bg-white/20 text-white" : ""}
                      >
                        {template.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Badge className={tipoInfo.color}>
                          {tipoInfo.label}
                        </Badge>
                        <Badge variant="outline">
                          {template.message_type === 'imagem' ? 'Imagem' : 'Texto'}
                        </Badge>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                          {template.mensagem}
                        </p>
                      </div>

                      {template.message_type === 'imagem' && template.imagem_url && (
                        <div className="text-xs text-gray-500">
                          📷 Imagem anexada
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPreview(template)}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(template)}
                          className="text-xs"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(template)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Modal de Criação/Edição */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
              <DialogDescription>
                Crie mensagens personalizadas para envio automático ou manual via WhatsApp
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulário */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Template *</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Aviso de Vencimento"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo do Template</Label>
                    <Select value={formData.tipo} onValueChange={(value: any) => setFormData({...formData, tipo: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_TEMPLATE.map(tipo => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="message_type">Formato da Mensagem</Label>
                    <Select 
                      value={formData.message_type} 
                      onValueChange={(value: any) => {
                        // Limpar campos específicos quando mudar o tipo
                        const newFormData = {
                          ...formData, 
                          message_type: value,
                          mensagem: '', // Limpar mensagem
                          imagem_url: '', // Limpar URL da imagem
                          imagem_caption: '' // Limpar legenda
                        }
                        setFormData(newFormData)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="texto">Apenas Texto</SelectItem>
                        <SelectItem value="imagem">Imagem + Legenda</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {formData.message_type === 'texto' 
                        ? 'Mensagem de texto simples' 
                        : 'Imagem com legenda (texto será enviado como legenda da imagem)'
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assunto">Assunto (Opcional)</Label>
                    <Input
                      id="assunto"
                      placeholder="Ex: Conta próxima do vencimento"
                      value={formData.assunto}
                      onChange={(e) => setFormData({...formData, assunto: e.target.value})}
                    />
                  </div>
                </div>

                {/* Campo Mensagem - apenas para templates de texto */}
                {formData.message_type === 'texto' && (
                  <div className="space-y-2">
                    <Label htmlFor="mensagem">Mensagem *</Label>
                    <Textarea
                      id="mensagem"
                      placeholder="Digite sua mensagem aqui... Use as variáveis disponíveis no painel ao lado."
                      value={formData.mensagem}
                      onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
                      rows={6}
                    />
                  </div>
                )}

                {/* Campos específicos para templates de imagem */}
                {formData.message_type === 'imagem' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="imagem_url">URL da Imagem *</Label>
                      <Input
                        id="imagem_url"
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={formData.imagem_url}
                        onChange={(e) => setFormData({...formData, imagem_url: e.target.value})}
                      />
                      <p className="text-xs text-gray-500">
                        URL da imagem que será enviada junto com a mensagem
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="imagem_caption">Legenda da Imagem *</Label>
                      <Textarea
                        id="imagem_caption"
                        placeholder="Digite a legenda que aparecerá junto com a imagem... Use as variáveis disponíveis no painel ao lado."
                        value={formData.imagem_caption}
                        onChange={(e) => {
                          setFormData({
                            ...formData, 
                            imagem_caption: e.target.value,
                            // Para templates de imagem, a mensagem é a legenda
                            mensagem: e.target.value
                          })
                        }}
                        rows={6}
                      />
                      <p className="text-xs text-gray-500">
                        Esta legenda será enviada junto com a imagem via WhatsApp
                      </p>
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="ativo">Template ativo</Label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                    {isEditing ? 'Atualizar' : 'Criar'} Template
                  </Button>
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>

              {/* Painel de Variáveis */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Variáveis Disponíveis
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Clique nas variáveis para copiá-las
                  </p>
                </div>

                {VARIAVEIS_DISPONIVEIS.map(categoria => (
                  <div key={categoria.categoria} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      {categoria.categoria === 'Cliente' && <User className="h-4 w-4" />}
                      {categoria.categoria === 'Plano' && <Package className="h-4 w-4" />}
                      {categoria.categoria === 'Servidor' && <Server className="h-4 w-4" />}
                      {categoria.categoria === 'Sistema' && <Settings className="h-4 w-4" />}
                      {categoria.categoria}
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {categoria.variaveis.map(variavel => (
                        <Badge
                          key={variavel}
                          variant="secondary"
                          className="cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(variavel)
                            toast({
                              title: "Copiado!",
                              description: `Variável ${variavel} copiada para a área de transferência`
                            })
                          }}
                        >
                          {variavel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Preview */}
        <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview do Template</DialogTitle>
              <DialogDescription>
                Visualização com dados de exemplo
              </DialogDescription>
            </DialogHeader>
            
            {selectedTemplate && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {selectedTemplate.nome}
                    </span>
                    <Badge className={getTipoInfo(selectedTemplate.tipo).color}>
                      {getTipoInfo(selectedTemplate.tipo).label}
                    </Badge>
                  </div>
                  
                  {selectedTemplate.assunto && (
                    <div className="mb-3">
                      <strong className="text-gray-700 dark:text-gray-300">Assunto:</strong>
                      <p className="text-gray-600 dark:text-gray-400">{selectedTemplate.assunto}</p>
                    </div>
                  )}
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {selectedTemplate.mensagem
                        .replace(/{nome}/g, 'João Silva')
                        .replace(/{whatsapp}/g, '(11) 99999-9999')
                        .replace(/{usuario}/g, 'joao123')
                        .replace(/{plano}/g, 'Premium HD')
                        .replace(/{valor_plano}/g, 'R$ 29,90')
                        .replace(/{data_vencimento}/g, '15/02/2025')
                        .replace(/{dias_vencimento}/g, '3')
                        .replace(/{servidor}/g, 'Servidor SP01')
                        .replace(/{data_atual}/g, new Date().toLocaleDateString('pt-BR'))
                        .replace(/{hora_atual}/g, new Date().toLocaleTimeString('pt-BR'))
                        .replace(/{nome_sistema}/g, 'Dashboard')
                      }
                    </p>
                    
                    {selectedTemplate.message_type === 'imagem' && selectedTemplate.imagem_url && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">📷 Imagem anexada:</p>
                        <p className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                          {selectedTemplate.imagem_url}
                        </p>
                        {selectedTemplate.imagem_caption && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Legenda:</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              {selectedTemplate.imagem_caption}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}