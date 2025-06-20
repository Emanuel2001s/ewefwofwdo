import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Users, UserCheck, UserX, Clock, Plus } from "lucide-react"
import { ClientesTable } from "@/components/clientes-table"
import { executeQuery } from "@/lib/db"
import { updateExpiredClients } from "@/lib/auto-update-clients"
import { RowDataPacket, OkPacket } from "mysql2"

async function getServidores() {
  const result = await executeQuery("SELECT id, nome FROM servidores ORDER BY nome ASC") as RowDataPacket[]
  return result as { id: number; nome: string; }[]
}

async function getClientesStats() {
  // Primeiro, atualizar clientes vencidos automaticamente
  await updateExpiredClients()
  
  // Depois buscar as estatísticas atualizadas
  const stats = await executeQuery(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as ativos,
      SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as inativos,
      SUM(CASE WHEN DATE(data_vencimento) = CURDATE() THEN 1 ELSE 0 END) as vencendo_hoje,
      SUM(CASE WHEN DATE(data_vencimento) < CURDATE() THEN 1 ELSE 0 END) as vencidos,
      SUM(CASE WHEN data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as vencendo_proximos_dias
    FROM clientes
  `) as RowDataPacket[]

  return {
    total: Number(stats[0]?.total) || 0,
    ativos: Number(stats[0]?.ativos) || 0,
    inativos: Number(stats[0]?.inativos) || 0,
    vencendo_hoje: Number(stats[0]?.vencendo_hoje) || 0,
    vencidos: Number(stats[0]?.vencidos) || 0,
    vencendo_proximos_dias: Number(stats[0]?.vencendo_proximos_dias) || 0,
  }
}

export default async function ClientesPage() {
  // Executar consultas em paralelo para melhor performance
  const [servidores, stats] = await Promise.all([
    getServidores(),
    getClientesStats()
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-end items-center mb-8">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <Link href="/admin/clientes/novo">
              <Plus className="mr-2 h-5 w-5" />
              Novo Cliente
            </Link>
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          {/* Total de Clientes */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-blue-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Total</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Clientes cadastrados</p>
              </div>
            </CardContent>
          </Card>

          {/* Clientes Ativos */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-green-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Ativos</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.ativos}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Em funcionamento</p>
              </div>
            </CardContent>
          </Card>

          {/* Clientes Inativos */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gray-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <UserX className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Inativos</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inativos}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Necessitam atenção</p>
              </div>
            </CardContent>
          </Card>

          {/* Vencendo Hoje */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-red-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Hoje</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.vencendo_hoje}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vencendo hoje</p>
              </div>
            </CardContent>
          </Card>

          {/* Vencidos */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-red-800 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <UserX className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Vencidos</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.vencidos}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Já venceram</p>
              </div>
            </CardContent>
          </Card>

          {/* Vencendo Próximos 7 Dias */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-orange-600 text-white pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">7 Dias</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.vencendo_proximos_dias}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Próximos 7 dias</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Clientes */}
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Users className="h-6 w-6" />
              Lista de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ClientesTable servidores={servidores} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
