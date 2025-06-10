import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlanosForm } from "@/components/planos-form"
import { PlanosTable } from "@/components/planos-table"
import { executeQuery } from "@/lib/db"

async function getPlanos() {
  return await executeQuery("SELECT id, nome, valor FROM planos ORDER BY nome ASC")
}

export default async function PlanosPage() {
  const planos = await getPlanos()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Planos</h1>
        <p className="text-muted-foreground">Gerencie os planos disponíveis para seus clientes</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Plano</CardTitle>
            <CardDescription>Cadastre um novo plano no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanosForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planos Cadastrados</CardTitle>
            <CardDescription>Lista de todos os planos disponíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanosTable planos={planos} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
