"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, Search, Trash2, MessageCircle, Send, X, FileText, DollarSign } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { ClientMobileCard } from "@/components/ui/client-mobile-card"

interface Cliente {
  id: number
  nome: string
  whatsapp: string
  data_vencimento: string
  plano: string
  servidor: string
  status: "ativo" | "inativo"
}

interface MessageTemplate {
  id: number
  nome: string
  tipo: string
  message_type: 'texto' | 'imagem'
  mensagem: string
  imagem_url?: string
  imagem_caption?: string
}

interface WhatsAppInstance {
  id: number
  nome: string
  status: 'conectada' | 'desconectada' | 'criando' | 'erro'
}

interface ClientesTableProps {
  clientes?: Cliente[]
  servidores: { id: number; nome: string }[]
  totalClientes?: number
  isAdminSupremo?: boolean
}

export function ClientesTable({ clientes: initialClientes, servidores, totalClientes: initialTotalClientes, isAdminSupremo = false }: ClientesTableProps) {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes || [])
  const [loading, setLoading] = useState(!initialClientes)
  const [filtro, setFiltro] = useState("")
  const [servidorFiltro, setServidorFiltro] = useState("all")
  const [statusFiltro, setStatusFiltro] = useState("all")
  const [vencimentoFiltro, setVencimentoFiltro] = useState("all")
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [selectedClients, setSelectedClients] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(initialTotalClientes || 0)

  // Estados do modal WhatsApp
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [selectedInstance, setSelectedInstance] = useState<number | null>(null)
  const [customMessage, setCustomMessage] = useState("")
  const [messagePreview, setMessagePreview] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Novos estados para o modal de pagamento
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [vencimentoTemplates, setVencimentoTemplates] = useState<MessageTemplate[]>([])
  const [selectedVencimentoTemplate, setSelectedVencimentoTemplate] = useState<number | null>(null)
  const [selectedPaymentInstance, setSelectedPaymentInstance] = useState<number | null>(null)
  const [customPaymentMessage, setCustomPaymentMessage] = useState("")
  const [paymentMessagePreview, setPaymentMessagePreview] = useState("")
  const [sendingPaymentMessage, setSendingPaymentMessage] = useState(false)
  const [loadingVencimentoTemplates, setLoadingVencimentoTemplates] = useState(false)

  useEffect(() => {
    if (!initialClientes) {
      carregarClientes()
    } else if (initialTotalClientes !== undefined) {
      setTotalItems(initialTotalClientes)
      setTotalPages(Math.ceil(initialTotalClientes / itemsPerPage))
    }
  }, [initialClientes, initialTotalClientes, itemsPerPage])

  useEffect(() => {
    carregarClientes()
  }, [currentPage, filtro, servidorFiltro, statusFiltro, vencimentoFiltro, itemsPerPage])

  // Carregar templates e instâncias quando abrir o modal
  useEffect(() => {
    if (whatsappModalOpen) {
      loadWhatsAppData()
    }
  }, [whatsappModalOpen])

  // Gerar preview do template quando selecionado
  useEffect(() => {
    if (selectedTemplate && selectedCliente) {
      generateTemplatePreview()
    }
  }, [selectedTemplate, selectedCliente])

  // Carregar templates de vencimento quando abrir o modal de pagamento
  useEffect(() => {
    if (paymentModalOpen) {
      loadVencimentoTemplates()
    }
  }, [paymentModalOpen])

  // Gerar preview do template de vencimento quando selecionado
  useEffect(() => {
    if (selectedVencimentoTemplate && selectedCliente) {
      generateVencimentoTemplatePreview()
    }
  }, [selectedVencimentoTemplate, selectedCliente])

  async function carregarClientes() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(filtro && { search: filtro }),
        ...(servidorFiltro !== "all" && { servidor: servidorFiltro }),
        ...(statusFiltro !== "all" && { status: statusFiltro }),
        ...(vencimentoFiltro !== "all" && { vencimento: vencimentoFiltro }),
      })
      const result = await fetch(`/api/clientes?${params.toString()}`)
      const data = await result.json()
      setClientes(data.data)
      setTotalItems(data.pagination.totalItems)
      setTotalPages(data.pagination.totalPages)
      setCurrentPage(data.pagination.currentPage)
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectClient = (id: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedClients((prev) => [...prev, id])
    } else {
      setSelectedClients((prev) => prev.filter((clientId) => clientId !== id))
    }
  }

  const handleSelectAllClients = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedClients(clientesFiltrados.map((cliente) => cliente.id))
    } else {
      setSelectedClients([])
    }
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1) // Reset para primeira página quando muda o número de itens
  }

  async function handleDelete(id: number) {
    setIsDeleting(id)
    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao excluir cliente")
      }

      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso.",
      })

      carregarClientes()
    } catch (error: any) {
      console.error("Erro ao excluir cliente:", error)
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir o cliente.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  async function handleDeleteSelected() {
    setIsDeleting(0)
    try {
      const response = await fetch("/api/clientes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedClients }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao excluir clientes selecionados")
      }

      toast({
        title: "Clientes excluídos",
        description: `Foram excluídos ${selectedClients.length} cliente(s) com sucesso.`,
      })

      setSelectedClients([])
      carregarClientes()
    } catch (error: any) {
      console.error("Erro ao excluir clientes selecionados:", error)
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao excluir os clientes selecionados.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  // Carregar dados do WhatsApp (templates e instâncias)
  async function loadWhatsAppData() {
    setLoadingTemplates(true)
    try {
      // Carregar templates
      const templatesResponse = await fetch('/api/evolution/templates')
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setTemplates(templatesData.data || [])
      }

      // Carregar instâncias
      const instancesResponse = await fetch('/api/evolution/instances')
      if (instancesResponse.ok) {
        const instancesData = await instancesResponse.json()
        console.log('Dados das instâncias recebidos:', instancesData)
        setInstances(instancesData.instancias || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados WhatsApp:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar templates e instâncias WhatsApp",
        variant: "destructive",
      })
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Gerar preview do template
  async function generateTemplatePreview() {
    if (!selectedTemplate || !selectedCliente) return

    try {
      const response = await fetch('/api/evolution/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          templateId: selectedTemplate,
          clienteId: selectedCliente.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessagePreview(data.preview || '')
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error)
    }
  }

  // Abrir modal WhatsApp
  const openWhatsAppModal = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setWhatsappModalOpen(true)
    setSelectedTemplate(null)
    setSelectedInstance(null)
    setCustomMessage("")
    setMessagePreview("")
  }

  // Fechar modal WhatsApp
  const closeWhatsAppModal = () => {
    setWhatsappModalOpen(false)
    setSelectedCliente(null)
    setSelectedTemplate(null)
    setSelectedInstance(null)
    setCustomMessage("")
    setMessagePreview("")
  }

  // Enviar mensagem WhatsApp
  async function sendWhatsAppMessage() {
    if (!selectedCliente || !selectedInstance) {
      toast({
        title: "Erro",
        description: "Selecione uma instância para enviar a mensagem",
        variant: "destructive",
      })
      return
    }

    const message = selectedTemplate ? messagePreview : customMessage
    if (!message.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma mensagem para enviar",
        variant: "destructive",
      })
      return
    }

    setSendingMessage(true)
    try {
      const response = await fetch('/api/evolution/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: selectedInstance,
          clienteId: selectedCliente.id,
          templateId: selectedTemplate,
          customMessage: selectedTemplate ? null : customMessage
        })
      })

      if (response.ok) {
        toast({
          title: "Mensagem enviada",
          description: `Mensagem enviada para ${selectedCliente.nome} via WhatsApp`,
        })
        closeWhatsAppModal()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao enviar mensagem')
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar mensagem WhatsApp",
        variant: "destructive",
      })
    } finally {
      setSendingMessage(false)
    }
  }

  async function loadVencimentoTemplates() {
    setLoadingVencimentoTemplates(true)
    try {
      const [templatesResponse, instancesResponse] = await Promise.all([
        fetch('/api/evolution/templates?tipo=vencimento'),
        fetch('/api/evolution/instances')
      ])

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setVencimentoTemplates(templatesData.data || [])
      }

      if (instancesResponse.ok) {
        const instancesData = await instancesResponse.json()
        console.log('Dados das instâncias de vencimento recebidos:', instancesData)
        setInstances(instancesData.instancias || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados de vencimento:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar templates de vencimento",
        variant: "destructive"
      })
    } finally {
      setLoadingVencimentoTemplates(false)
    }
  }

  async function generateVencimentoTemplatePreview() {
    if (!selectedVencimentoTemplate || !selectedCliente) return

    try {
      const template = vencimentoTemplates.find(t => t.id === selectedVencimentoTemplate)
      if (!template) return

      const response = await fetch('/api/evolution/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          templateId: selectedVencimentoTemplate,
          clienteId: selectedCliente.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPaymentMessagePreview(data.preview)
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error)
    }
  }

  const openPaymentModal = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setPaymentModalOpen(true)
    setSelectedVencimentoTemplate(null)
    setSelectedPaymentInstance(null)
    setCustomPaymentMessage("")
    setPaymentMessagePreview("")
  }

  const closePaymentModal = () => {
    setPaymentModalOpen(false)
    setSelectedCliente(null)
    setSelectedVencimentoTemplate(null)
    setSelectedPaymentInstance(null)
    setCustomPaymentMessage("")
    setPaymentMessagePreview("")
  }

  async function sendPaymentMessage() {
    if (!selectedCliente || !selectedPaymentInstance || (!selectedVencimentoTemplate && !customPaymentMessage.trim())) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      })
      return
    }

    setSendingPaymentMessage(true)
    try {
      const messageData = {
        clienteId: selectedCliente.id,
        instanceId: selectedPaymentInstance,
        ...(selectedVencimentoTemplate 
          ? { templateId: selectedVencimentoTemplate }
          : { customMessage: customPaymentMessage }
        )
      }

      const response = await fetch('/api/evolution/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Mensagem enviada!",
          description: `Mensagem de vencimento enviada para ${selectedCliente.nome}`,
        })
        closePaymentModal()
      } else {
        throw new Error(result.error || 'Erro ao enviar mensagem')
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      toast({
        title: "Erro ao enviar",
        description: error.message || "Erro inesperado ao enviar mensagem",
        variant: "destructive"
      })
    } finally {
      setSendingPaymentMessage(false)
    }
  }

  const clientesFiltrados = clientes.filter((cliente) => {
    const matchFiltro = cliente.nome.toLowerCase().includes(filtro.toLowerCase()) || cliente.whatsapp.includes(filtro)

    const matchServidor = servidorFiltro === "all" ? true : cliente.servidor === servidorFiltro;
    const matchStatus = statusFiltro === "all" ? true : cliente.status === statusFiltro

    return matchFiltro && matchServidor && matchStatus
  })

  function formatarData(dataString: string) {
    const data = new Date(dataString)
    return data.toLocaleDateString("pt-BR")
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou whatsapp..."
            className="pl-8"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
        
        {/* Filtros */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Select value={servidorFiltro} onValueChange={setServidorFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Servidor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os servidores</SelectItem>
              {servidores.map((servidor) => (
                <SelectItem key={servidor.id} value={servidor.nome}>
                  {servidor.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={vencimentoFiltro} onValueChange={setVencimentoFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Vencimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="vencendo_hoje">🔥 Vencendo Hoje</SelectItem>
              <SelectItem value="vencido">❌ Vencidos</SelectItem>
              <SelectItem value="vencendo_proximos_dias">⏰ Próximos 7 Dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="25">25 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={selectedClients.length === 0 || isDeleting === 0}
                className="col-span-2 sm:col-span-1"
              >
                {isDeleting === 0 ? "Excluindo..." : `Excluir (${selectedClients.length})`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir {selectedClients.length} cliente(s) selecionado(s)? Esta ação não pode ser
                  desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected}>
                  {isDeleting === 0 ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Informações da paginação */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
          Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} clientes
        </p>
      </div>

      {/* Tabela Desktop */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedClients.length === clientesFiltrados.length && clientesFiltrados.length > 0}
                  onCheckedChange={handleSelectAllClients}
                  disabled={loading}
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Servidor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Carregando clientes...
                </TableCell>
              </TableRow>
            ) : clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              clientesFiltrados.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedClients.includes(cliente.id)}
                      onCheckedChange={(isChecked) => handleSelectClient(cliente.id, isChecked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell>{cliente.whatsapp}</TableCell>
                  <TableCell>{formatarData(cliente.data_vencimento)}</TableCell>
                  <TableCell>{cliente.plano}</TableCell>
                  <TableCell>{cliente.servidor}</TableCell>
                  <TableCell>
                    <Badge variant={cliente.status === "ativo" ? "default" : "destructive"}>
                      {cliente.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end space-x-2">
                    {isAdminSupremo && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openPaymentModal(cliente)}
                          className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                          title="Enviar mensagem de vencimento"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openWhatsAppModal(cliente)}
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          title="Enviar mensagem WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/clientes/${cliente.id}/editar`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isDeleting === cliente.id}>
                          {isDeleting === cliente.id ? "Excluindo..." : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o cliente {cliente.nome}? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(cliente.id)}>
                            {isDeleting === cliente.id ? "Excluindo..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cards Mobile */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Carregando clientes...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          clientesFiltrados.map((cliente) => (
            <ClientMobileCard 
              key={cliente.id} 
              cliente={cliente} 
              onDelete={handleDelete}
              isDeleting={isDeleting}
              onWhatsApp={isAdminSupremo ? openWhatsAppModal : undefined}
              onPayment={isAdminSupremo ? openPaymentModal : undefined}
            />
          ))
        )}
      </div>
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationPrevious
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            aria-disabled={currentPage === 1 || loading}
            className={(currentPage === 1 || loading) ? "pointer-events-none opacity-50" : ""}
          />
          {[...Array(totalPages)].map((_, index) => (
            <PaginationItem key={index}>
              <PaginationLink
                isActive={currentPage === index + 1}
                onClick={() => setCurrentPage(index + 1)}
                aria-disabled={loading}
                className={loading ? "pointer-events-none opacity-50" : ""}
              >
                {index + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationNext
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            aria-disabled={currentPage === totalPages || loading}
            className={(currentPage === totalPages || loading) ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationContent>
      </Pagination>

      {/* Modal de Pagamento/Vencimento */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
              Enviar Mensagem de Vencimento
            </DialogTitle>
            <DialogDescription>
              {selectedCliente && (
                <>Enviar mensagem de vencimento para <strong>{selectedCliente.nome}</strong> ({selectedCliente.whatsapp})</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Instâncias */}
            <div className="space-y-2">
              <Label htmlFor="payment-instance">Instância WhatsApp *</Label>
              <Select 
                value={selectedPaymentInstance?.toString() || ""} 
                onValueChange={(value) => setSelectedPaymentInstance(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {instances.filter(i => i.status === 'conectada').map((instance) => (
                    <SelectItem key={instance.id} value={instance.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        {instance.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {instances.filter(i => i.status === 'conectada').length === 0 && (
                <p className="text-sm text-orange-600">⚠️ Nenhuma instância conectada disponível</p>
              )}
            </div>

            {/* Tipo de Mensagem */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Templates de Vencimento */}
              <Card className="shadow-md">
                <CardHeader className="bg-yellow-50 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Templates de Vencimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {loadingVencimentoTemplates ? (
                    <p className="text-sm text-gray-500">Carregando templates...</p>
                  ) : (
                    <Select 
                      value={selectedVencimentoTemplate?.toString() || ""} 
                      onValueChange={(value) => {
                        setSelectedVencimentoTemplate(value ? Number(value) : null)
                        setCustomPaymentMessage("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher template de vencimento" />
                      </SelectTrigger>
                      <SelectContent>
                        {vencimentoTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{template.nome}</span>
                              <span className="text-xs text-gray-500">
                                {template.message_type === 'texto' ? 'Texto' : 'Texto + Imagem'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {selectedVencimentoTemplate && paymentMessagePreview && (
                    <div className="mt-3">
                      <Label className="text-xs text-gray-600">Preview:</Label>
                      <div className="p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
                        {paymentMessagePreview}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mensagem Personalizada */}
              <Card className="shadow-md">
                <CardHeader className="bg-blue-50 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Mensagem Personalizada
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Textarea
                    placeholder="Digite sua mensagem de vencimento personalizada aqui..."
                    value={customPaymentMessage}
                    onChange={(e) => {
                      setCustomPaymentMessage(e.target.value)
                      setSelectedVencimentoTemplate(null)
                    }}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Use uma mensagem personalizada ou selecione um template de vencimento acima
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closePaymentModal}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={sendPaymentMessage}
              disabled={sendingPaymentMessage || !selectedPaymentInstance || (!selectedVencimentoTemplate && !customPaymentMessage.trim())}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {sendingPaymentMessage ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal WhatsApp */}
      <Dialog open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              Enviar Mensagem WhatsApp
            </DialogTitle>
            <DialogDescription>
              {selectedCliente && (
                <>Enviar mensagem para <strong>{selectedCliente.nome}</strong> ({selectedCliente.whatsapp})</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Instâncias */}
            <div className="space-y-2">
              <Label htmlFor="instance">Instância WhatsApp *</Label>
              <Select 
                value={selectedInstance?.toString() || ""} 
                onValueChange={(value) => setSelectedInstance(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {instances.filter(i => i.status === 'conectada').map((instance) => (
                    <SelectItem key={instance.id} value={instance.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        {instance.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {instances.filter(i => i.status === 'conectada').length === 0 && (
                <p className="text-sm text-orange-600">⚠️ Nenhuma instância conectada disponível</p>
              )}
            </div>

            {/* Tipo de Mensagem */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Templates */}
              <Card className="shadow-md">
                <CardHeader className="bg-blue-50 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Templates Prontos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {loadingTemplates ? (
                    <p className="text-sm text-gray-500">Carregando templates...</p>
                  ) : (
                    <Select 
                      value={selectedTemplate?.toString() || ""} 
                      onValueChange={(value) => {
                        setSelectedTemplate(value ? Number(value) : null)
                        setCustomMessage("")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{template.nome}</span>
                              <span className="text-xs text-gray-500">
                                {template.tipo} • {template.message_type}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {selectedTemplate && messagePreview && (
                    <div className="mt-3">
                      <Label className="text-xs text-gray-600">Preview:</Label>
                      <div className="p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
                        {messagePreview}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mensagem Personalizada */}
              <Card className="shadow-md">
                <CardHeader className="bg-green-50 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Mensagem Personalizada
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Textarea
                    placeholder="Digite sua mensagem personalizada aqui..."
                    value={customMessage}
                    onChange={(e) => {
                      setCustomMessage(e.target.value)
                      setSelectedTemplate(null)
                    }}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Use uma mensagem personalizada ou selecione um template acima
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeWhatsAppModal}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={sendWhatsAppMessage}
              disabled={sendingMessage || !selectedInstance || (!selectedTemplate && !customMessage.trim())}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendingMessage ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
