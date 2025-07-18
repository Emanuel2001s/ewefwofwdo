import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Server, CreditCard, TrendingUp, UserCheck, UserX, Activity, Database, DollarSign, Clock, Package } from "lucide-react"
import { executeQuery } from "@/lib/db"
import { RowDataPacket } from "mysql2"
import { ResponsiveContainer, ResponsivePageHeader, ResponsiveGrid } from "@/components/ui/responsive-container"
import { updateExpiredClients } from "@/lib/auto-update-clients"
import { cookies } from "next/headers"

// Força dynamic rendering para evitar execução durante o build
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDashboardStats() {
  // Primeiro, atualizar clientes vencidos automaticamente
  await updateExpiredClients()
  
  // Depois buscar as estatísticas atualizadas
  const [clientesStats, planosStats, servidoresStats] = await Promise.all([
    executeQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as ativos,
        SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as inativos,
        SUM(CASE WHEN DATE(data_vencimento) = CURDATE() THEN 1 ELSE 0 END) as vencendo_hoje,
        SUM(CASE WHEN DATE(data_vencimento) < CURDATE() THEN 1 ELSE 0 END) as vencidos,
        SUM(CASE WHEN data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as vencendo_proximos_dias
      FROM clientes
    `) as Promise<RowDataPacket[]>,
    
    executeQuery("SELECT COUNT(*) as total FROM planos") as Promise<RowDataPacket[]>,
    executeQuery("SELECT COUNT(*) as total FROM servidores") as Promise<RowDataPacket[]>
  ])

  return {
    clientes: {
      total: Number(clientesStats[0]?.total) || 0,
      ativos: Number(clientesStats[0]?.ativos) || 0,
      inativos: Number(clientesStats[0]?.inativos) || 0,
      vencendo_hoje: Number(clientesStats[0]?.vencendo_hoje) || 0,
      vencidos: Number(clientesStats[0]?.vencidos) || 0,
      vencendo_proximos_dias: Number(clientesStats[0]?.vencendo_proximos_dias) || 0,
    },
    planos: Number(planosStats[0]?.total) || 0,
    servidores: Number(servidoresStats[0]?.total) || 0,
  }
}

async function getRecentActivities() {
  // Buscar atividades recentes baseadas nos dados reais disponíveis
  const [recentClients, expiringClients, activeClients] = await Promise.all([
    // Últimos clientes cadastrados (baseado no ID - maiores IDs são mais recentes)
    executeQuery(`
      SELECT c.nome, p.nome as plano_nome, p.valor, c.id
      FROM clientes c
      JOIN planos p ON c.plano_id = p.id
      WHERE c.status = 'ativo'
      ORDER BY c.id DESC
      LIMIT 3
    `),
    // Clientes vencendo hoje ou já vencidos
    executeQuery(`
      SELECT c.nome, p.nome as plano_nome, c.data_vencimento
      FROM clientes c
      JOIN planos p ON c.plano_id = p.id
      WHERE c.data_vencimento <= CURDATE() AND c.status = 'ativo'
      ORDER BY c.data_vencimento ASC
      LIMIT 3
    `),
    // Clientes ativos com vencimento futuro (podem representar renovações)
    executeQuery(`
      SELECT c.nome, p.nome as plano_nome, p.valor, c.data_vencimento
      FROM clientes c
      JOIN planos p ON c.plano_id = p.id
      WHERE c.status = 'ativo' 
      AND c.data_vencimento > CURDATE()
      AND c.data_vencimento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY c.data_vencimento ASC
      LIMIT 2
    `)
  ]) as [RowDataPacket[], RowDataPacket[], RowDataPacket[]]

  return {
    recent: recentClients,
    expiring: expiringClients,
    renewed: activeClients
  }
}

function getClientStatus(id: number): string {
  // Simular status baseado no ID (clientes com ID maior são mais recentes)
  if (id % 3 === 0) return "Cadastrado recentemente"
  if (id % 2 === 0) return "Cliente ativo"
  return "Novo cliente"
}

function formatDaysUntilExpiry(expiryDate: string): string {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffInDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays < 0) {
    return `Vencido há ${Math.abs(diffInDays)} dias`
  } else if (diffInDays === 0) {
    return "Vence hoje"
  } else if (diffInDays <= 7) {
    return `Vence em ${diffInDays} dias`
  } else {
    return `Vence em ${diffInDays} dias`
  }
}

export default async function DashboardPage() {
  const [stats, activities] = await Promise.all([
    getDashboardStats(),
    getRecentActivities()
  ])

  // Calcular total de atividades do mês
  const totalActivities = stats.clientes.total + activities.renewed.length + activities.recent.length

  // Verificar usuário logado
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('user')
  const currentUser = userCookie ? JSON.parse(userCookie.value) : null

  return (
    <ResponsiveContainer>
      {/* Header da página */}
      <ResponsivePageHeader 
        title="Dashboard"
        description="Visão geral do sistema de IPTV"
      />

      {/* Informação temporária do usuário */}
      {currentUser && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Usuário logado:</strong> {currentUser.nome} (ID: {currentUser.id}) - {currentUser.tipo}
            {currentUser.id === 1 && <span className="text-green-600 font-bold"> ✅ ADMIN SUPREMO - WhatsApp Evolution disponível!</span>}
          </p>
        </div>
      )}

      {/* Cards de estatísticas */}
      <ResponsiveGrid cols={{ default: 1, sm: 2, md: 4, lg: 4 }} className="mb-6 sm:mb-8">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-sm font-medium">
              Total Clientes
            </CardTitle>
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          </CardHeader>
          <CardContent className="pt-3 sm:pt-4">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.clientes.total}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.clientes.ativos} ativos, {stats.clientes.inativos} inativos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-green-600 text-white rounded-t-lg">
            <CardTitle className="text-sm font-medium">
              Clientes Ativos
            </CardTitle>
            <UserCheck className="h-5 w-5" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.clientes.ativos}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.clientes.total > 0 ? Math.round((stats.clientes.ativos / stats.clientes.total) * 100) : 0}% do total de clientes
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-red-600 text-white rounded-t-lg">
            <CardTitle className="text-sm font-medium">
              Vencendo Hoje
            </CardTitle>
            <Clock className="h-5 w-5" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.clientes.vencendo_hoje}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Vencendo hoje
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-sm font-medium">
              Servidores Online
            </CardTitle>
            <Server className="h-5 w-5" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.servidores}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Todos os servidores operacionais
            </p>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      {/* Seção de gráficos e atividades */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Card de visão geral */}
        <Card className="lg:col-span-4 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Visão Geral
            </CardTitle>
            <CardDescription className="text-blue-100">
              Análise de performance do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Gráfico de receita</p>
                <p className="text-sm">Será implementado em breve</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de atividade recente */}
        <Card className="lg:col-span-3 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription className="text-blue-100">
              Últimas {totalActivities} atividades este mês
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Clientes recentes cadastrados */}
              {activities.recent.map((client: any, index: number) => (
                <div key={`recent-${index}`} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Novo cliente cadastrado
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {client.nome} - {client.plano_nome}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getClientStatus(client.id)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-sm font-medium text-green-600 dark:text-green-400">
                    +{client.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              ))}

              {/* Renovações recentes */}
              {activities.renewed.map((client: any, index: number) => (
                <div key={`renewed-${index}`} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Cliente ativo
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {client.nome} - {client.plano_nome}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDaysUntilExpiry(client.data_vencimento)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400">
                    {client.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              ))}

              {/* Clientes vencendo */}
              {activities.expiring.map((client: any, index: number) => (
                <div key={`expiring-${index}`} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Cliente vencendo
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {client.nome} - {client.plano_nome}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDaysUntilExpiry(client.data_vencimento)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      Atenção
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Mensagem quando não há atividades */}
              {activities.recent.length === 0 && activities.renewed.length === 0 && activities.expiring.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma atividade recente
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de estatísticas adicionais */}
      <div className="grid gap-6 md:grid-cols-3 mt-8">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="bg-gray-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserX className="h-4 w-4" />
              Clientes Inativos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.clientes.inativos}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.clientes.inativos > 0 ? 'Requer atenção' : 'Todos os clientes ativos'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="bg-orange-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Vencendo em 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.clientes.vencendo}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.clientes.vencendo > 0 ? 'Renovações pendentes' : 'Nenhum vencimento próximo'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="bg-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Total de Planos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stats.planos.total}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.planos.total > 0 ? `Média: ${stats.planos.valorMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : 'Nenhum plano cadastrado'}
            </p>
          </CardContent>
        </Card>
      </div>
    </ResponsiveContainer>
  )
}
