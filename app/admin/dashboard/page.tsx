import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, DollarSign, AlertCircle, Calendar } from "lucide-react"
import { executeQuery } from "@/lib/db"
import { ClientesTable } from "@/components/clientes-table"

async function getMetricas() {
  // Total de clientes
  const totalClientes = await executeQuery("SELECT COUNT(*) as total FROM clientes")

  // Valor total a receber no mês atual
  const valorTotal = await executeQuery(`
    SELECT SUM(p.valor) as total 
    FROM clientes c 
    JOIN planos p ON c.plano_id = p.id 
    WHERE c.status = 'ativo'
  `)

  // Clientes inativos
  const clientesInativos = await executeQuery("SELECT COUNT(*) as total FROM clientes WHERE status = 'inativo'")

  // Clientes com vencimento nos próximos 7 dias
  const clientesVencendo = await executeQuery(`
    SELECT COUNT(*) as total 
    FROM clientes 
    WHERE data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
  `)

  return {
    totalClientes: totalClientes[0]?.total || 0,
    valorTotal: valorTotal[0]?.total || 0,
    clientesInativos: clientesInativos[0]?.total || 0,
    clientesVencendo: clientesVencendo[0]?.total || 0,
  }
}

async function getClientesVencendo() {
  return await executeQuery(`
    SELECT c.id, c.nome, c.whatsapp, c.data_vencimento, p.nome as plano, s.nome as servidor, c.status
    FROM clientes c
    JOIN planos p ON c.plano_id = p.id
    JOIN servidores s ON c.servidor_id = s.id
    WHERE c.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY c.data_vencimento ASC
    LIMIT 10
  `)
}

async function getServidores() {
  return await executeQuery("SELECT id, nome FROM servidores")
}

export default async function AdminDashboard() {
  const metricas = await getMetricas()
  const clientesVencendo = await getClientesVencendo()
  const servidores = await getServidores()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio de IPTV</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalClientes}</div>
            <p className="text-xs text-muted-foreground">Clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor a Receber</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {metricas.valorTotal.toFixed(2).replace(".", ",")}</div>
            <p className="text-xs text-muted-foreground">No mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Inativos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.clientesInativos}</div>
            <p className="text-xs text-muted-foreground">Necessitam atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencendo em 7 dias</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.clientesVencendo}</div>
            <p className="text-xs text-muted-foreground">Próximos vencimentos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vencendo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vencendo">Vencendo em 7 dias</TabsTrigger>
          <TabsTrigger value="todos">Todos os Clientes</TabsTrigger>
        </TabsList>
        <TabsContent value="vencendo" className="space-y-4">
          <ClientesTable clientes={clientesVencendo} servidores={servidores} />
        </TabsContent>
        <TabsContent value="todos" className="space-y-4">
          <ClientesTable servidores={servidores} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
