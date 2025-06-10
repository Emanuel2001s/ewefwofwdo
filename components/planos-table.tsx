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

interface PlanosTableProps {
  planos: { id: number; nome: string; valor: number }[]
}

export function PlanosTable({ planos }: PlanosTableProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    setIsDeleting(id)

    try {
      const response = await fetch(`/api/planos/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erro ao excluir plano")
      }

      toast({
        title: "Plano excluído",
        description: "O plano foi excluído com sucesso.",
      })

      router.refresh()
    } catch (error) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir o plano.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const formatarValor = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {planos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-4">
                Nenhum plano cadastrado.
              </TableCell>
            </TableRow>
          ) : (
            planos.map((plano) => (
              <TableRow key={plano.id}>
                <TableCell className="font-medium">{plano.nome}</TableCell>
                <TableCell>{formatarValor(plano.valor)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/planos/${plano.id}/editar`)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar plano</span>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir plano</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o plano "{plano.nome}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(plano.id)} disabled={isDeleting === plano.id}>
                            {isDeleting === plano.id ? "Excluindo..." : "Excluir"}
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
