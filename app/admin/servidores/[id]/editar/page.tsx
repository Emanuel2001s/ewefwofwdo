import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ServerForm } from "@/components/server-form"
import { executeQuery } from "@/lib/db"
import { notFound } from "next/navigation"
import { RowDataPacket } from "mysql2"

async function getServidor(id: number): Promise<{ id: number; nome: string } | null> {
  const result = (await executeQuery("SELECT id, nome FROM servidores WHERE id = ?", [id])) as RowDataPacket[]
  return result.length > 0 ? (result[0] as { id: number; nome: string }) : null
}

export default async function EditarServidorPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (isNaN(id)) {
    notFound()
  }

  const servidor = await getServidor(id)
  if (!servidor) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Servidor</h1>
        <p className="text-muted-foreground">Altere as informações do servidor</p>
      </div>

      <Card>
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <CardTitle>Editar Servidor</CardTitle>
        </CardHeader>
        <ServerForm servidor={servidor} />
      </Card>
    </div>
  )
} 