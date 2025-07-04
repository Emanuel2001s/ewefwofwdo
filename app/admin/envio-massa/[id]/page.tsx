"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { ResponsiveTable } from "@/components/ui/responsive-table"
import { Badge } from "@/components/ui/badge"

interface Envio {
  id: number
  cliente_id: number
  cliente_nome: string
  cliente_telefone: string
  status: string
  data_criacao: string
  data_atualizacao: string
  mensagem: string | null
  resposta: string | null
}

interface Campanha {
  id: number
  nome: string
  template_id: number
  instancia_id: number
  status: string
  total_clientes: number
  enviados: number
  sucessos: number
  falhas: number
  data_criacao: string
  data_inicio: string | null
  data_conclusao: string | null
  template_nome: string
  template_conteudo: string
  instancia_nome: string
  instancia_status: string
}

export default function DetalheCampanha() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [campanha, setCampanha] = useState<Campanha | null>(null)
  const [envios, setEnvios] = useState<Envio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const columns = [
    {
      key: "cliente_nome",
      label: "Cliente",
      render: (item: Envio) => item.cliente_nome
    },
    {
      key: "cliente_telefone",
      label: "Telefone",
      render: (item: Envio) => item.cliente_telefone
    },
    {
      key: "status",
      label: "Status",
      render: (item: Envio) => (
        <Badge variant={
          item.status === "sucesso" ? "default" :
          item.status === "erro" ? "destructive" :
          "secondary"
        }>
          {item.status}
        </Badge>
      )
    },
    {
      key: "data_criacao",
      label: "Data",
      render: (item: Envio) => new Date(item.data_criacao).toLocaleString()
    }
  ]

  useEffect(() => {
    if (!params.id) {
      setError("ID da campanha não fornecido")
      setLoading(false)
      return
    }
    carregarDetalhes()
  }, [params.id])

  async function carregarDetalhes() {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 [DEBUG Frontend] ID da campanha: "${params.id}"`)
      const response = await fetch(`/api/envio-massa/${params.id}`)
      console.log(`🔍 [DEBUG Frontend] Response status: ${response.status}`)
      
      const data = await response.json()
      console.log(`🔍 [DEBUG Frontend] Resposta da API:`, data)

      if (!response.ok) {
        console.error(`❌ [DEBUG Frontend] Erro da API:`, data)
        throw new Error(data.error || "Erro ao carregar detalhes")
      }

      if (!data.campanha) {
        throw new Error("Dados da campanha não encontrados na resposta")
      }

      setCampanha(data.campanha)
      setEnvios(data.envios || [])
    } catch (error) {
      console.error(`❌ [DEBUG Frontend] Erro:`, error)
      setError(error instanceof Error ? error.message : "Erro ao carregar detalhes da campanha")
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar os detalhes da campanha",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function excluirCampanha() {
    try {
      const response = await fetch(`/api/envio-massa/${params.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir campanha")
      }

      toast({
        title: "Sucesso",
        description: "Campanha excluída com sucesso",
      })

      router.push("/admin/envio-massa")
    } catch (error) {
      console.error("Erro ao excluir campanha:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir campanha",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
          <CardDescription>Aguarde enquanto carregamos os detalhes da campanha</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erro</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/admin/envio-massa")}>Voltar</Button>
        </CardContent>
      </Card>
    )
  }

  if (!campanha) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campanha não encontrada</CardTitle>
          <CardDescription>Não foi possível encontrar os detalhes desta campanha</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/admin/envio-massa")}>Voltar</Button>
        </CardContent>
      </Card>
    )
  }

  const totalPages = Math.ceil(envios.length / pageSize)
  const paginatedData = envios.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{campanha.nome}</CardTitle>
              <CardDescription>
                Template: {campanha.template_nome} | Instância: {campanha.instancia_nome} ({campanha.instancia_status})
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Excluir Campanha</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a campanha e todos os seus dados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={excluirCampanha}>
                    Continuar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm font-medium">Status</h3>
              <div className="mt-1">
                <Badge variant={
                  campanha.status === "concluida" ? "default" :
                  campanha.status === "enviando" ? "secondary" :
                  campanha.status === "agendada" ? "secondary" :
                  "destructive"
                }>
                  {campanha.status || "pendente"}
                </Badge>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium">Total de Clientes</h3>
              <div className="mt-1">{campanha.total_clientes}</div>
            </div>
            <div>
              <h3 className="text-sm font-medium">Progresso</h3>
              <p>{campanha.enviados} enviados ({campanha.sucessos} sucessos, {campanha.falhas} falhas)</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Datas</h3>
              <p className="text-sm">
                Criação: {new Date(campanha.data_criacao).toLocaleString()}<br />
                {campanha.data_inicio && `Início: ${new Date(campanha.data_inicio).toLocaleString()}`}<br />
                {campanha.data_conclusao && `Conclusão: ${new Date(campanha.data_conclusao).toLocaleString()}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes dos Envios</CardTitle>
          <CardDescription>
            {envios.length} envios encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            columns={columns}
            data={paginatedData}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: setCurrentPage
            }}
            emptyMessage="Nenhum envio encontrado"
          />
        </CardContent>
      </Card>
    </div>
  )
} 