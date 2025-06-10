import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, CreditCard, Monitor, Smartphone, Laptop, Tv } from "lucide-react"
import { executeQuery } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { format } from "date-fns"

async function getClienteData(userId: number) {
  const cliente = await executeQuery(
    `
    SELECT c.*, p.nome as plano_nome, p.valor as plano_valor, s.nome as servidor_nome
    FROM clientes c
    JOIN planos p ON c.plano_id = p.id
    JOIN servidores s ON c.servidor_id = s.id
    WHERE c.usuario_id = ?
  `,
    [userId],
  )

  return cliente.length > 0 ? cliente[0] : null
}

export default async function ClienteDashboard() {
  const user = await getAuthUser()

  if (!user) {
    return null
  }

  const cliente = await getClienteData(user.id)

  if (!cliente) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu painel de cliente</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações não encontradas</CardTitle>
            <CardDescription>
              Não encontramos informações associadas à sua conta. Por favor, entre em contato com o suporte.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo ao seu painel de cliente, {user.nome}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Seus dados cadastrados no sistema</CardDescription>
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
            <CardDescription>Detalhes do seu plano atual</CardDescription>
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Dispositivos</CardTitle>
            <CardDescription>Dispositivos habilitados para uso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {dispositivos.length > 0 ? (
                dispositivos.map((dispositivo) => (
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
            <CardDescription>Seus últimos pagamentos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-2 text-center">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Histórico de pagamentos em breve</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
