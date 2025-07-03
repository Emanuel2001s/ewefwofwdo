import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserX, Clock, Plus, MessageCircle } from "lucide-react"
import { ClientesTable } from "@/components/clientes-table"
import { executeQuery } from "@/lib/db"
import { updateExpiredClients } from "@/lib/auto-update-clients"
import { isAdminSupremo } from "@/lib/admin-middleware"
import { cookies } from "next/headers"
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

async function getWhatsAppStats() {
  try {
    // Usar uma única query com subqueries para reduzir conexões
    const result = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM evolution_instancias) as instancias_total,
        (SELECT COUNT(*) FROM evolution_instancias WHERE status = 'conectada') as instancias_conectadas,
        (SELECT COUNT(*) FROM message_templates WHERE ativo = true) as templates_total,
        (SELECT COUNT(*) FROM message_history WHERE DATE(created_at) = CURDATE()) as mensagens_hoje,
        (SELECT COUNT(*) FROM message_history WHERE DATE(created_at) = CURDATE() AND status = 'enviada') as mensagens_enviadas_hoje
    `) as RowDataPacket[]

    const stats = result[0] || {}
    return {
      instancias_total: Number(stats.instancias_total) || 0,
      instancias_conectadas: Number(stats.instancias_conectadas) || 0,
      templates_total: Number(stats.templates_total) || 0,
      mensagens_hoje: Number(stats.mensagens_hoje) || 0,
      mensagens_enviadas_hoje: Number(stats.mensagens_enviadas_hoje) || 0,
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas WhatsApp:', error)
    return {
      instancias_total: 0,
      instancias_conectadas: 0,
      templates_total: 0,
      mensagens_hoje: 0,
      mensagens_enviadas_hoje: 0,
    }
  }
}

export default async function ClientesPage() {
  // Verificar se o usuário é Admin Supremo para mostrar funcionalidades WhatsApp
  const isAdminSupremoUser = await isAdminSupremo()

  // Executar consultas sequencialmente para evitar excesso de conexões
  const servidores = await getServidores()
  const stats = await getClientesStats()
  const whatsappStats = isAdminSupremoUser ? await getWhatsAppStats() : {
      instancias_total: 0,
      instancias_conectadas: 0,
      templates_total: 0,
      mensagens_hoje: 0,
      mensagens_enviadas_hoje: 0,
  }

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

        {/* Card WhatsApp (apenas para Admin Supremo) */}
        {isAdminSupremoUser && (
          <Card className="mb-6 overflow-hidden border-0 bg-white/80 shadow-xl backdrop-blur-sm dark:bg-gray-800/80 sm:mb-8">
            <CardHeader className="bg-green-600 p-3 text-white sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <CardTitle className="text-sm font-semibold sm:text-base lg:text-lg">WhatsApp Evolution API</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                    {whatsappStats.instancias_total}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Instâncias</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600 sm:text-xl">
                    {whatsappStats.instancias_conectadas}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Conectadas</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600 sm:text-xl">
                    {whatsappStats.templates_total}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Templates</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600 sm:text-xl">
                    {whatsappStats.mensagens_hoje}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Msg Hoje</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700 sm:text-xl">
                    {whatsappStats.mensagens_enviadas_hoje}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Enviadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
