"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { login } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("type") || "cliente"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent, userType: string) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await login(email, password, userType)

      // Redirecionar com base no tipo de usuário
      if (userType === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/cliente/dashboard")
      }
    } catch (err) {
      setError("Credenciais inválidas. Por favor, tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">Entre com seu e-mail e senha para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="cliente">Cliente</TabsTrigger>
              <TabsTrigger value="admin">Administrador</TabsTrigger>
            </TabsList>

            <TabsContent value="cliente">
              <form onSubmit={(e) => handleSubmit(e, "cliente")}>
                <div className="space-y-4">
                  {error && <div className="text-sm font-medium text-destructive text-center">{error}</div>}
                  <div className="space-y-2">
                    <Label htmlFor="email-cliente">Email</Label>
                    <Input
                      id="email-cliente"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password-cliente">Senha</Label>
                      <Link href="/esqueci-senha" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <Input
                      id="password-cliente"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar como Cliente"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={(e) => handleSubmit(e, "admin")}>
                <div className="space-y-4">
                  {error && <div className="text-sm font-medium text-destructive text-center">{error}</div>}
                  <div className="space-y-2">
                    <Label htmlFor="email-admin">Email</Label>
                    <Input
                      id="email-admin"
                      type="email"
                      placeholder="admin@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password-admin">Senha</Label>
                      <Link href="/esqueci-senha" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <Input
                      id="password-admin"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar como Admin"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            Não tem uma conta?{" "}
            <Link href="/register" className="text-blue-600 hover:underline dark:text-blue-400">
              Registre-se
            </Link>
          </div>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">Voltar para Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
