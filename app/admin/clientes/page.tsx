import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserX, Clock, Plus } from "lucide-react"
import { ClientesTable } from "@/components/clientes-table"
import { executeQuery } from "@/lib/db"
import { updateExpiredClients } from "@/lib/auto-update-clients"
import { isAdminSupremo } from "@/lib/admin-middleware"
import { RowDataPacket } from "mysql2"

// Força dynamic rendering para evitar execução durante o build
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getServidores() {
  const result = await executeQuery("SELECT id, nome FROM servidores ORDER BY nome ASC") as RowDataPacket[]
  return result as { id: number; nome: string; }[]
}

async function getClientesStats() {
  // Primeiro, atualizar clientes vencidos automaticamente
  await updateExpiredClients()

  // Buscar estatísticas atualizadas
  const [stats] = await executeQuery(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as ativos,
      SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as inativos,
      SUM(CASE WHEN DATE(data_vencimento) = CURDATE() THEN 1 ELSE 0 END) as vencendo_hoje,
      SUM(CASE WHEN status = 'vencido' THEN 1 ELSE 0 END) as vencidos,
      SUM(CASE 
        WHEN DATE(data_vencimento) > CURDATE() 
        AND DATE(data_vencimento) <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        THEN 1 ELSE 0 END
      ) as vencendo_proximos_dias
    FROM clientes
  `) as RowDataPacket[]

  return stats as {
    total: number
    ativos: number
    inativos: number
    vencendo_hoje: number
    vencidos: number
    vencendo_proximos_dias: number
  }
}

export default async function ClientesPage() {
  // Executar consultas sequencialmente para evitar excesso de conexões
  const servidores = await getServidores()
  const stats = await getClientesStats()
  const isAdminSupremoUser = await isAdminSupremo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header Mobile-First */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl lg:text-3xl">
                Gerenciar Clientes
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:mt-2">
                Controle total dos seus clientes IPTV
              </p>
            </div>
            <Button 
              asChild 
              size="sm" 
              className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto sm:size-lg"
            >
              <Link href="/admin/clientes/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Link>
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas - Grid Responsivo */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-3 sm:gap-4 md:grid-cols-6 lg:gap-6">
          {/* Total de Clientes */}
          <Card className="overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-blue-600 p-2 text-white sm:p-3 lg:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
                <CardTitle className="text-xs font-semibold sm:text-sm lg:text-base">Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 lg:p-4">
              <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl lg:text-2xl">
                {stats.total}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Cadastrados</p>
            </CardContent>
          </Card>

          {/* Clientes Ativos */}
          <Card className="overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-green-600 p-2 text-white sm:p-3 lg:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                  <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
                <CardTitle className="text-xs font-semibold sm:text-sm lg:text-base">Ativos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 lg:p-4">
              <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl lg:text-2xl">
                {stats.ativos}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Funcionando</p>
            </CardContent>
          </Card>

          {/* Clientes Inativos */}
          <Card className="overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-gray-600 p-2 text-white sm:p-3 lg:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                  <UserX className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
                <CardTitle className="text-xs font-semibold sm:text-sm lg:text-base">Inativos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 lg:p-4">
              <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl lg:text-2xl">
                {stats.inativos}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Atenção</p>
            </CardContent>
          </Card>

          {/* Vencendo Hoje */}
          <Card className="overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-red-600 p-2 text-white sm:p-3 lg:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
                <CardTitle className="text-xs font-semibold sm:text-sm lg:text-base">Hoje</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 lg:p-4">
              <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl lg:text-2xl">
                {stats.vencendo_hoje}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Vencendo</p>
            </CardContent>
          </Card>

          {/* Vencidos */}
          <Card className="overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-red-800 p-2 text-white sm:p-3 lg:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                  <UserX className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
                <CardTitle className="text-xs font-semibold sm:text-sm lg:text-base">Vencidos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 lg:p-4">
              <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl lg:text-2xl">
                {stats.vencidos}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Urgente</p>
            </CardContent>
          </Card>

          {/* Próximos 7 dias */}
          <Card className="overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader className="bg-orange-600 p-2 text-white sm:p-3 lg:p-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm sm:p-2">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
                <CardTitle className="text-xs font-semibold sm:text-sm lg:text-base">7 Dias</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 lg:p-4">
              <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl lg:text-2xl">
                {stats.vencendo_proximos_dias}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Em breve</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Clientes */}
        <Card className="overflow-hidden border-0 bg-white/80 shadow-2xl backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader className="bg-blue-600 p-3 text-white sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <CardTitle className="text-sm font-semibold sm:text-base lg:text-lg">Lista de Clientes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ClientesTable 
              servidores={servidores}
              isAdminSupremo={isAdminSupremoUser}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
