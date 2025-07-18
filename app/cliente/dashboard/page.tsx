import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Monitor, Smartphone, Laptop, Tv, AlertTriangle, CheckCircle, Clock, Settings, UserCheck, Package, Server } from "lucide-react"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { format, differenceInDays, isPast, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { RowDataPacket } from "mysql2"
import { ClienteDashboardMobile } from "@/components/ui/client-dashboard-mobile"

// Força dynamic rendering para evitar execução durante o build
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getClienteData(usuario: string) {
  const cliente = await executeQuery(
    `
    SELECT 
      c.*,
      p.nome as plano_nome, 
      p.valor as plano_valor, 
      p.duracao_dias as plano_duracao
    FROM clientes c
    JOIN planos p ON c.plano_id = p.id
    WHERE c.usuario = ?
  `,
    [usuario],
  ) as RowDataPacket[]

  return cliente.length > 0 ? cliente[0] : null
}

function getStatusVencimento(dataVencimento: Date) {
  const hoje = new Date()
  const diasParaVencimento = differenceInDays(dataVencimento, hoje)
  
  if (isPast(dataVencimento) && !isToday(dataVencimento)) {
    return {
      status: 'vencido',
      label: 'Vencido',
      variant: 'destructive' as const,
      icon: <AlertTriangle className="h-5 w-5" />,
      description: `Venceu há ${Math.abs(diasParaVencimento)} ${Math.abs(diasParaVencimento) === 1 ? 'dia' : 'dias'}`,
      color: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800'
    }
  }
  
  if (isToday(dataVencimento)) {
    return {
      status: 'vence_hoje',
      label: 'Vence Hoje',
      variant: 'destructive' as const,
      icon: <AlertTriangle className="h-5 w-5" />,
      description: 'Seu plano vence hoje!',
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
  }
  
  if (diasParaVencimento <= 3) {
    return {
      status: 'proximo_vencimento',
      label: 'Próximo ao Vencimento',
      variant: 'secondary' as const,
      icon: <Clock className="h-5 w-5" />,
      description: `Vence em ${diasParaVencimento} ${diasParaVencimento === 1 ? 'dia' : 'dias'}`,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    }
  }
  
  if (diasParaVencimento <= 7) {
    return {
      status: 'vence_semana',
      label: 'Vence em 1 Semana',
      variant: 'outline' as const,
      icon: <Clock className="h-5 w-5" />,
      description: `Vence em ${diasParaVencimento} dias`,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800'
    }
  }
  
  return {
    status: 'ativo',
    label: 'Ativo',
    variant: 'default' as const,
    icon: <CheckCircle className="h-5 w-5" />,
    description: `Vence em ${diasParaVencimento} dias`,
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800'
  }
}

function formatarDuracao(dias: number) {
  if (dias === 1) return "1 dia"
  if (dias === 7) return "1 semana"
  if (dias === 30) return "1 mês"
  if (dias === 90) return "3 meses"
  if (dias === 180) return "6 meses"
  if (dias === 365) return "1 ano"
  return `${dias} dias`
}

export default async function ClienteDashboard() {
  const user = await getAuthUser()

  if (!user) {
    return null
  }

  // Para clientes, o campo usuario está disponível no token JWT
  const usuarioLogin = (user as any).usuario

  const cliente = await getClienteData(usuarioLogin)

  if (!cliente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Bem-vindo ao seu painel de cliente</p>
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader className="bg-red-50 dark:bg-red-950">
              <CardTitle className="text-red-800 dark:text-red-200">Informações não encontradas</CardTitle>
              <CardDescription className="text-red-600 dark:text-red-300">
                Não encontramos informações associadas à sua conta. Por favor, entre em contato com o suporte.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  const dispositivos = cliente.dispositivos ? cliente.dispositivos.split(",") : []
  const dataVencimento = new Date(cliente.data_vencimento)
  const dataAtivacao = cliente.data_ativacao ? new Date(cliente.data_ativacao) : null
  const statusVencimento = getStatusVencimento(dataVencimento)

  const getDispositivoIcon = (dispositivo: string) => {
    const iconClass = "h-5 w-5 sm:h-6 sm:w-6"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6">
      {/* Mobile Layout - Visível apenas em telas pequenas */}
      <div className="block md:hidden max-w-md mx-auto">
        <ClienteDashboardMobile 
          cliente={cliente} 
          statusVencimento={statusVencimento} 
          user={user} 
        />
      </div>

      {/* Desktop Layout - Visível apenas em telas maiores */}
      <div className="hidden md:block max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300">
            Olá, <span className="font-semibold text-blue-600 dark:text-blue-400">{user.nome}</span>! 👋
          </p>
        </div>

        {/* Status do Plano - Destaque Principal */}
        <Card className={`${statusVencimento.bgColor} ${statusVencimento.borderColor} border-2 shadow-2xl overflow-hidden`}>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 sm:p-3 rounded-full ${statusVencimento.color} text-white shadow-lg`}>
                  {statusVencimento.icon}
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Status do Plano
                  </CardTitle>
                  <CardDescription className="text-base sm:text-xl font-semibold">
                    {statusVencimento.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex justify-center sm:justify-end">
                <Badge variant={statusVencimento.variant} className="text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 font-semibold">
                  {statusVencimento.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300" />
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Data de Vencimento</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {format(dataVencimento, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Plano Atual</p>
                <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{cliente.plano_nome}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Principal - 2 Cards */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-green-600 text-white rounded-t-lg">
              <CardTitle className="text-base sm:text-xl font-medium">
                Status da Conta
              </CardTitle>
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </div>
              <p className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                {statusVencimento.description}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-base sm:text-xl font-medium">
                Plano Atual
              </CardTitle>
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {cliente.plano_nome}
              </div>
              <p className="text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-400">
                {cliente.plano_valor?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dispositivos - Card Expandido */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
              Dispositivos Liberados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-8">
            {dispositivos.length > 0 ? (
              <>
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {dispositivos.map((dispositivo: string) => (
                    <div key={dispositivo} className="group hover:scale-105 transition-transform duration-200">
                      <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 border border-indigo-200 dark:border-gray-500 shadow-lg">
                        <div className="p-2 sm:p-3 rounded-full bg-indigo-500 text-white shadow-lg group-hover:bg-indigo-600 transition-colors">
                          {getDispositivoIcon(dispositivo)}
                        </div>
                        <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white text-center">{dispositivo}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-500 text-white">
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm sm:text-base text-blue-900 dark:text-blue-100">Total de Dispositivos</p>
                        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">Dispositivos ativos na sua conta</p>
                      </div>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{dispositivos.length}</p>
                      <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">liberados</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="p-3 sm:p-4 rounded-full bg-gray-100 dark:bg-gray-700 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                  <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <p className="text-base sm:text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">Nenhum dispositivo habilitado</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Entre em contato com o suporte para liberar dispositivos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
