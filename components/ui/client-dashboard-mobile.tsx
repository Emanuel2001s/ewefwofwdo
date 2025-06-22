"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Monitor, Smartphone, Laptop, Tv, AlertTriangle, CheckCircle, Clock, Settings, UserCheck, Package } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ClienteDashboardMobileProps {
  cliente: any // Usando any para compatibilidade com RowDataPacket
  statusVencimento: {
    status: string
    label: string
    variant: 'default' | 'destructive' | 'secondary' | 'outline'
    icon: React.ReactNode
    description: string
    color: string
    bgColor: string
    borderColor: string
  }
  user: {
    nome: string
  }
}

export function ClienteDashboardMobile({ cliente, statusVencimento, user }: ClienteDashboardMobileProps) {
  const dispositivos = cliente.dispositivos ? cliente.dispositivos.split(",") : []
  const dataVencimento = new Date(cliente.data_vencimento)

  const getDispositivoIcon = (dispositivo: string) => {
    const iconClass = "h-4 w-4"
    switch (dispositivo) {
      case "TV":
        return <Tv className={iconClass} />
      case "Celular":
        return <Smartphone className={iconClass} />
      case "PC":
        return <Monitor className={iconClass} />
      case "Notebook":
        return <Laptop className={iconClass} />
      default:
        return <Monitor className={iconClass} />
    }
  }

  return (
    <div className="space-y-4">
      {/* Saudação */}
      <div className="text-center">
        <p className="text-base font-medium text-gray-600 dark:text-gray-300">
          Olá, <span className="font-semibold text-blue-600 dark:text-blue-400">{user.nome}</span>! 👋
        </p>
      </div>

      {/* Status Principal - Compacto */}
      <Card className={`${statusVencimento.bgColor} ${statusVencimento.borderColor} border-2`}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${statusVencimento.color} text-white`}>
              {statusVencimento.icon}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                {statusVencimento.label}
              </CardTitle>
              <CardDescription className="text-sm">
                {statusVencimento.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Vencimento</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {format(dataVencimento, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Plano</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{cliente.plano_nome}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs text-green-700 dark:text-green-300">Status</p>
                <p className="text-sm font-bold text-green-800 dark:text-green-200">
                  {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">Valor</p>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
                  {cliente.plano_valor?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispositivos - Compacto */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" />
            Dispositivos ({dispositivos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dispositivos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dispositivos.map((dispositivo: string) => (
                <div key={dispositivo} className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950 px-2 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {getDispositivoIcon(dispositivo)}
                  <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{dispositivo}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              Nenhum dispositivo liberado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 