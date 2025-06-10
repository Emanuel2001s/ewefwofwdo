"use client"

import { useState } from "react"
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

interface ServidoresTableProps {
  servidores: { id: number; nome: string }[]
}

export function ServidoresTable({ servidores }: ServidoresTableProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    setIsDeleting(id)

    try {
      const response = await fetch(`/api/servidores/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erro ao excluir servidor")
      }

      toast({
        title: "Servidor excluído",
        description: "O servidor foi excluído com sucesso.",
      })

      router.refresh()
    } catch (error) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir o servidor.",
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
          {servidores.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-4">
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
                      onClick={() => router.push(`/admin/servidores/${servidor.id}/editar`)}
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
                            disabled={isDeleting === servidor.id}
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
    </div>
  )
}
