import React from "react"
import Link from "next/link"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"
import { Button } from "./button"
import { Edit, Eye, Trash2, MessageCircle, DollarSign } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./alert-dialog"

interface Cliente {
  id: number
  nome: string
  whatsapp: string
  data_vencimento: string
  plano: string
  servidor: string
  status: "ativo" | "inativo"
}

interface ClientMobileCardProps {
  cliente: Cliente
  onDelete: (id: number) => Promise<void>
  isDeleting: number | null
  onWhatsApp?: (cliente: Cliente) => void
  onPayment?: (cliente: Cliente) => void
}

export function ClientMobileCard({ cliente, onDelete, isDeleting, onWhatsApp, onPayment }: ClientMobileCardProps) {
  const formatarData = (dataString: string) => {
    const data = new Date(dataString)
    return data.toLocaleDateString("pt-BR")
  }

  const getStatusVariant = (status: string) => {
    return status === "ativo" ? "default" : "secondary"
  }

  const isVencimentoProximo = (dataVencimento: string) => {
    const hoje = new Date()
    const vencimento = new Date(dataVencimento)
    const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return diffDias <= 7 && diffDias >= 0
  }

  const isVencido = (dataVencimento: string) => {
    const hoje = new Date()
    const vencimento = new Date(dataVencimento)
    return vencimento < hoje
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header do Card */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {cliente.nome}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {cliente.whatsapp}
            </p>
          </div>
          <Badge 
            variant={getStatusVariant(cliente.status)}
            className="ml-2"
          >
            {cliente.status === "ativo" ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {/* Informações do Cliente */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Plano:</span>
            <span className="font-medium text-gray-900 dark:text-white">{cliente.plano}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Servidor:</span>
            <span className="font-medium text-gray-900 dark:text-white">{cliente.servidor}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Vencimento:</span>
            <span className={`font-medium ${
              isVencido(cliente.data_vencimento) 
                ? "text-red-600 dark:text-red-400" 
                : isVencimentoProximo(cliente.data_vencimento)
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-gray-900 dark:text-white"
            }`}>
              {formatarData(cliente.data_vencimento)}
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {onPayment && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onPayment(cliente)}
              className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700"
              title="Enviar mensagem de vencimento"
            >
              <DollarSign className="h-3 w-3" />
            </Button>
          )}
          
          {onWhatsApp && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onWhatsApp(cliente)}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700"
              title="Enviar mensagem WhatsApp"
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
          )}
          
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/admin/clientes/${cliente.id}`}>
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Link>
          </Button>
          
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/admin/clientes/${cliente.id}/editar`}>
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Link>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                disabled={isDeleting === cliente.id}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o cliente "{cliente.nome}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(cliente.id)}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting === cliente.id}
                >
                  {isDeleting === cliente.id ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
} 