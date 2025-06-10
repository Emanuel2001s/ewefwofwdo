import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-5xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
          IPTV Manager
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
          Sistema completo para gerenciamento de clientes, servidores e planos de IPTV. Simplifique seu negócio com
          nossa plataforma intuitiva.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Painel Administrativo</CardTitle>
              <CardDescription>Gerencie todos os aspectos do seu negócio</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-left space-y-2 text-slate-600 dark:text-slate-400">
                <li>Dashboard com métricas importantes</li>
                <li>Gerenciamento de clientes</li>
                <li>Cadastro de servidores e planos</li>
                <li>Relatórios e filtros avançados</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/login?type=admin">Acesso Admin</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Área do Cliente</CardTitle>
              <CardDescription>Acesse suas informações e serviços</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-left space-y-2 text-slate-600 dark:text-slate-400">
                <li>Visualize seus dados pessoais</li>
                <li>Consulte detalhes do seu plano</li>
                <li>Verifique data de vencimento</li>
                <li>Histórico de pagamentos</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/login?type=cliente">Área do Cliente</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/register">Criar Conta</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
