import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Edit, Monitor, Smartphone, Laptop, Tv } from "lucide-react"
import { executeQuery } from "@/lib/db"
import { format } from "date-fns"

async function getCliente(id: string) {
  const cliente = await executeQuery(
    `
    SELECT c.*, p.nome as plano_nome, p.valor as plano_valor, s.nome as servidor_nome
    FROM clientes c
    JOIN planos p ON c.plano_id = p.id
    JOIN servidores s ON c.servidor_id = s.id
    WHERE c.id = ?
  `,
    [id],
  )

  return cliente.length > 0 ? cliente[0] : null
}

export default async function ClienteDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cliente = await getCliente(id)

  if (!cliente) {
    notFound()
  }

  const dispositivos = cliente.dispositivos ? cliente.dispositivos.split(",") : []

  const getDispositivoIcon = (dispositivo: string) => {
    switch (dispositivo) {
      case "TV":
        return <Tv className="h-5 w-5" />
      case "Celular":
        return <Smartphone className="h-5 w-5" />
      case "PC":
        return <Monitor className="h-5 w-5" />
      case "Notebook":
        return <Laptop className="h-5 w-5" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{cliente.nome}</h1>
          <p className="text-muted-foreground">Detalhes do cliente</p>
        </div>
        <Button asChild>
          <Link href={`/admin/clientes/${cliente.id}/editar`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Cliente
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Dados cadastrais do cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome</p>
                <p className="text-lg font-medium">{cliente.nome}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                <p className="text-lg font-medium">{cliente.whatsapp}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={cliente.status === "ativo" ? "default" : "destructive"}>
                  {cliente.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plano e Pagamento</CardTitle>
            <CardDescription>Detalhes do plano contratado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plano</p>
                <p className="text-lg font-medium">{cliente.plano_nome}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor</p>
                <p className="text-lg font-medium">
                  {cliente.plano_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Servidor</p>
                <p className="text-lg font-medium">{cliente.servidor_nome}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vencimento</p>
                <div className="flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-medium">{format(new Date(cliente.data_vencimento), "dd/MM/yyyy")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispositivos</CardTitle>
            <CardDescription>Dispositivos habilitados para uso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {dispositivos.length > 0 ? (
                dispositivos.map((dispositivo: string) => (
                  <div key={dispositivo} className="flex items-center gap-2 rounded-lg border p-3">
                    {getDispositivoIcon(dispositivo)}
                    <span>{dispositivo}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Nenhum dispositivo habilitado</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
            <CardDescription>Informações adicionais sobre o cliente</CardDescription>
          </CardHeader>
          <CardContent>
            {cliente.observacoes ? (
              <p className="whitespace-pre-line">{cliente.observacoes}</p>
            ) : (
              <p className="text-muted-foreground">Nenhuma observação registrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href="/admin/clientes">Voltar para Lista</Link>
        </Button>
      </div>
    </div>
  )
}
