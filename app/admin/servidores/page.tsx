import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Server, Users, Globe, Activity, Edit } from "lucide-react"
import { executeQuery } from "@/lib/db"
import { RowDataPacket } from "mysql2"

async function getServidores() {
  const servidores = await executeQuery(`
    SELECT 
      s.*,
      COUNT(c.id) as clientes_ativos
    FROM servidores s
    LEFT JOIN clientes c ON c.servidor_id = s.id AND c.status = 'ativo'
    GROUP BY s.id
    ORDER BY s.nome ASC
  `) as RowDataPacket[]
  
  return servidores as Array<{
    id: number
    nome: string
    clientes_ativos: number
  }>
}

export default async function ServidoresPage() {
  const servidores = await getServidores()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header com botão */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Servidores</h1>
        <Button className="bg-blue-600 hover:bg-blue-700" asChild>
          <Link href="/admin/servidores/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Servidor
          </Link>
        </Button>
      </div>

      {/* Grid de cards dos servidores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {servidores.map((servidor) => (
          <Card key={servidor.id} className="hover:shadow-lg transition-shadow max-w-sm">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5" />
                {servidor.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-green-600">
                    {servidor.clientes_ativos}
                  </div>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </div>
                
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-blue-600">
                    Online
                  </div>
                  <p className="text-xs text-muted-foreground">Status</p>
                </div>
              </div>
              
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <Globe className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                <div className="text-sm font-semibold text-gray-700">
                  Servidor {servidor.id}
                </div>
                <p className="text-xs text-muted-foreground">Identificação</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                  <Link href={`/admin/servidores/${servidor.id}/editar`}>
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs text-red-600 hover:text-red-700">
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {servidores.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum servidor cadastrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
