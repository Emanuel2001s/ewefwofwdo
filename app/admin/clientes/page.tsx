import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { ClientesTable } from "@/components/clientes-table"
import { executeQuery } from "@/lib/db"

async function getServidores() {
  return await executeQuery("SELECT id, nome FROM servidores ORDER BY nome ASC")
}

export default async function ClientesPage() {
  const servidores = await getServidores()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie os clientes cadastrados no sistema</p>
        </div>
        <Button asChild>
          <Link href="/admin/clientes/novo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Cliente
          </Link>
        </Button>
      </div>

      <ClientesTable servidores={servidores} />
    </div>
  )
}
