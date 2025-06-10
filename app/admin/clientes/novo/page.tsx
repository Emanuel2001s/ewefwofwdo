import { Card } from "@/components/ui/card"
import { ClienteForm } from "@/components/cliente-form"
import { executeQuery } from "@/lib/db"

async function getServidores() {
  return await executeQuery("SELECT id, nome FROM servidores ORDER BY nome ASC")
}

async function getPlanos() {
  return await executeQuery("SELECT id, nome, valor FROM planos ORDER BY nome ASC")
}

export default async function NovoClientePage() {
  const servidores = await getServidores()
  const planos = await getPlanos()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Cliente</h1>
        <p className="text-muted-foreground">Cadastre um novo cliente no sistema</p>
      </div>

      <Card className="p-6">
        <ClienteForm servidores={servidores} planos={planos} />
      </Card>
    </div>
  )
}
