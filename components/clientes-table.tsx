"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, Search, Trash2 } from "lucide-react"
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

interface Cliente {
  id: number
  nome: string
  whatsapp: string
  data_vencimento: string
  plano: string
  servidor: string
  status: "ativo" | "inativo"
}

interface ClientesTableProps {
  clientes?: Cliente[]
  servidores: { id: number; nome: string }[]
  totalClientes?: number
}

export function ClientesTable({ clientes: initialClientes, servidores, totalClientes: initialTotalClientes }: ClientesTableProps) {
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou whatsapp..."
            className="pl-8"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
        <Select value={servidorFiltro} onValueChange={setServidorFiltro}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vencimentoFiltro} onValueChange={setVencimentoFiltro}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
          <SelectTrigger className="w-full sm:w-[140px]">
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
            <Button variant="outline" disabled={selectedClients.length === 0 || isDeleting === 0}>
              {isDeleting === 0 ? "Excluindo..." : `Excluir Selecionados (${selectedClients.length})`}
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

      {/* Informações da paginação */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} clientes
        </p>
      </div>

      <div className="rounded-md border">
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
    </div>
  )
}
