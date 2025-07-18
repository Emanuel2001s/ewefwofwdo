import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExportButtons } from "@/components/relatorios-export"
import { TabelaClientesPaginada } from "@/components/tabela-clientes-paginada"
import { TabelaVencimentosPaginada } from "@/components/tabela-vencimentos-paginada"
import { ResponsiveContainer, ResponsivePageHeader, ResponsiveGrid } from "@/components/ui/responsive-container"
import { 
  DollarSign, 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Calendar,
  Package
} from "lucide-react"
import { executeQuery } from "@/lib/db"
import { RowDataPacket } from "mysql2"

// Força dynamic rendering para evitar execução durante o build
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Interfaces para os dados
interface DashboardStats {
  total_clientes: number
  clientes_ativos: number
  clientes_inativos: number
  total_receita_mes: number
  receita_pendente: number
  clientes_vencendo: number
}

interface ClienteRelatorio {
  id: number
  nome: string
  whatsapp: string
  plano_nome: string
  plano_valor: number
  data_vencimento: string
  status: string
  servidor_nome: string
  dias_vencimento: number
}

interface ReceitaPorPlano {
  plano_nome: string
  total_clientes: number
  receita_total: number
  receita_ativa: number
}

// Função para buscar estatísticas gerais
async function getDashboardStats(): Promise<DashboardStats> {
  const [stats] = await executeQuery(`
    SELECT 
      COUNT(*) as total_clientes,
      SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as clientes_ativos,
      SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as clientes_inativos,
      SUM(CASE WHEN status = 'ativo' THEN p.valor ELSE 0 END) as total_receita_mes,
      SUM(CASE WHEN status = 'inativo' AND DATEDIFF(CURDATE(), data_vencimento) <= 30 THEN p.valor ELSE 0 END) as receita_pendente,
      SUM(CASE WHEN status = 'ativo' AND DATEDIFF(data_vencimento, CURDATE()) BETWEEN 0 AND 7 THEN 1 ELSE 0 END) as clientes_vencendo
    FROM clientes c
    LEFT JOIN planos p ON c.plano_id = p.id
  `) as RowDataPacket[]
  
  return stats as DashboardStats
}

// Função para buscar clientes detalhados
async function getClientesRelatorio(): Promise<ClienteRelatorio[]> {
  const clientes = await executeQuery(`
    SELECT 
      c.id,
      c.nome,
      c.whatsapp,
      p.nome as plano_nome,
      p.valor as plano_valor,
      c.data_vencimento,
      c.status,
      s.nome as servidor_nome,
      DATEDIFF(c.data_vencimento, CURDATE()) as dias_vencimento
    FROM clientes c
    LEFT JOIN planos p ON c.plano_id = p.id
    LEFT JOIN servidores s ON c.servidor_id = s.id
    ORDER BY c.data_vencimento ASC
  `) as RowDataPacket[]
  
  return clientes as ClienteRelatorio[]
}

// Função para buscar receita por plano
async function getReceitaPorPlano(): Promise<ReceitaPorPlano[]> {
  const receita = await executeQuery(`
    SELECT 
      p.nome as plano_nome,
      COUNT(c.id) as total_clientes,
      COUNT(c.id) * p.valor as receita_total,
      SUM(CASE WHEN c.status = 'ativo' THEN p.valor ELSE 0 END) as receita_ativa
    FROM planos p
    LEFT JOIN clientes c ON c.plano_id = p.id
    GROUP BY p.id, p.nome, p.valor
    ORDER BY receita_ativa DESC
  `) as RowDataPacket[]
  
  return receita as ReceitaPorPlano[]
}

export default async function RelatoriosPage() {
  const [stats, clientes, receitaPorPlano] = await Promise.all([
    getDashboardStats(),
    getClientesRelatorio(),
    getReceitaPorPlano()
  ])

  return (
    <ResponsiveContainer className="space-y-6">
      {/* Header */}
      <ResponsivePageHeader 
        title="Relatórios"
        description="Análise detalhada de clientes, receitas e vencimentos"
      >
        <ExportButtons data={clientes} filename="relatorio-clientes" />
      </ResponsivePageHeader>

      {/* Conteúdo do relatório para exportação */}
      <div data-report-content>
        {/* Cards de estatísticas */}
        <ResponsiveGrid cols={{ default: 1, sm: 2, md: 3, lg: 6 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.total_clientes}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Clientes Ativos</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              <span className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.clientes_ativos}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">Clientes Inativos</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
              <span className="text-xl sm:text-2xl font-bold text-red-900 dark:text-red-100">
                {stats.clientes_inativos}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">Receita do Mês</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              <span className="text-sm sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
                {Number(stats.total_receita_mes || 0).toLocaleString("pt-BR", { 
                  style: "currency", 
                  currency: "BRL" 
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">Receita Pendente</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
              <span className="text-sm sm:text-2xl font-bold text-orange-900 dark:text-orange-100">
                {Number(stats.receita_pendente || 0).toLocaleString("pt-BR", { 
                  style: "currency", 
                  currency: "BRL" 
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-yellow-700 dark:text-yellow-300">Vencendo (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xl sm:text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {stats.clientes_vencendo}
              </span>
            </div>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      {/* Tabs para diferentes relatórios */}
      <Tabs defaultValue="clientes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="clientes" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Relatório de </span>Clientes
          </TabsTrigger>
          <TabsTrigger value="receita" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Receita por </span>Plano
          </TabsTrigger>
          <TabsTrigger value="vencimentos" className="text-xs sm:text-sm">
            Vencimentos
          </TabsTrigger>
        </TabsList>

        {/* Relatório de Clientes */}
        <TabsContent value="clientes" className="space-y-4">
          <TabelaClientesPaginada clientes={clientes} />
        </TabsContent>

        {/* Receita por Plano */}
        <TabsContent value="receita" className="space-y-4">
          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 3 }}>
            {receitaPorPlano.map((plano) => (
              <Card key={plano.plano_nome} className="hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5" />
                    {plano.plano_nome}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                      <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                        {plano.total_clientes}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total de Clientes</p>
                    </div>
                    
                    <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <div className="text-sm sm:text-lg font-bold text-green-600 dark:text-green-400">
                        {Number(plano.receita_ativa || 0).toLocaleString("pt-BR", { 
                          style: "currency", 
                          currency: "BRL" 
                        })}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Receita Ativa</p>
                    </div>

                    <div className="text-center p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                      <div className="text-sm sm:text-lg font-bold text-purple-600 dark:text-purple-400">
                        {Number(plano.receita_total || 0).toLocaleString("pt-BR", { 
                          style: "currency", 
                          currency: "BRL" 
                        })}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Receita Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>
        </TabsContent>

        {/* Vencimentos */}
        <TabsContent value="vencimentos" className="space-y-4">
          <TabelaVencimentosPaginada clientes={clientes} />
        </TabsContent>
      </Tabs>
      </div>
    </ResponsiveContainer>
  )
}