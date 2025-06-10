import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ServidoresForm } from "@/components/servidores-form"
import { ServidoresTable } from "@/components/servidores-table"
import { executeQuery } from "@/lib/db"

async function getServidores() {
  return await executeQuery("SELECT id, nome FROM servidores ORDER BY nome ASC")
}

export default async function ServidoresPage() {
  const servidores = await getServidores()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Servidores</h1>
        <p className="text-muted-foreground">Gerencie os servidores disponíveis para seus clientes</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Servidor</CardTitle>
            <CardDescription>Cadastre um novo servidor no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ServidoresForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servidores Cadastrados</CardTitle>
            <CardDescription>Lista de todos os servidores disponíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <ServidoresTable servidores={servidores} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
