"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
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
import { Edit, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"

interface Servidor {
  id: number
  nome: string
}

interface ServidoresTableProps {
  // A prop 'servidores' será removida, pois a tabela buscará seus próprios dados
}

export function ServidoresTable({ }: ServidoresTableProps) {
  const router = useRouter()
  const [servidores, setServidores] = useState<Servidor[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    carregarServidores()
  }, [currentPage, itemsPerPage])

  async function carregarServidores() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })
      const result = await fetch(`/api/servidores?${params.toString()}`)
      const data = await result.json()
      setServidores(data.data)
      setTotalItems(data.pagination.totalItems)
      setTotalPages(data.pagination.totalPages)
      setCurrentPage(data.pagination.currentPage)
    } catch (error) {
      console.error("Erro ao carregar servidores:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao carregar os servidores.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    setIsDeleting(id)

    try {
      const response = await fetch(`/api/servidores/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao excluir servidor")
      }

      toast({
        title: "Servidor excluído",
        description: "O servidor foi excluído com sucesso.",
      })

      carregarServidores() // Recarrega os servidores após a exclusão
    } catch (error) {
      console.error("Erro:", error)
      toast({
        title: "Falha ao Excluir Servidor",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir o servidor.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-8">
                Carregando servidores...
              </TableCell>
            </TableRow>
          ) : servidores.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-8">
                Nenhum servidor cadastrado.
              </TableCell>
            </TableRow>
          ) : (
            servidores.map((servidor) => (
              <TableRow key={servidor.id}>
                <TableCell className="font-medium">{servidor.nome}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/servidores/editar/${servidor.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar servidor</span>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir servidor</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o servidor "{servidor.nome}"? Esta ação não pode ser
                            desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(servidor.id)}
                            aria-disabled={isDeleting === servidor.id || loading}
                            className={(isDeleting === servidor.id || loading) ? "pointer-events-none opacity-50" : ""}
                          >
                            {isDeleting === servidor.id ? "Excluindo..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {/* Controles de Paginação */}
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
