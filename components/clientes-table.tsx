"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, Search } from "lucide-react"

interface Cliente {
  id: number
  nome: string
  whatsapp: string
  data_vencimento: string
  plano: string
  servidor: string
  status: "ativo" | "inativo"
}

interface ClientesTableProps {
  clientes?: Cliente[]
  servidores: { id: number; nome: string }[]
}

export function ClientesTable({ clientes: initialClientes, servidores }: ClientesTableProps) {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes || [])
  const [loading, setLoading] = useState(!initialClientes)
  const [filtro, setFiltro] = useState("")
  const [servidorFiltro, setServidorFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("")

  useEffect(() => {
    if (!initialClientes) {
      carregarClientes()
    }
  }, [initialClientes])

  async function carregarClientes() {
    setLoading(true)
    try {
      const result = await fetch("/api/clientes")
      const data = await result.json()
      setClientes(data)
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  const clientesFiltrados = clientes.filter((cliente) => {
    const matchFiltro = cliente.nome.toLowerCase().includes(filtro.toLowerCase()) || cliente.whatsapp.includes(filtro)

    const matchServidor = servidorFiltro ? cliente.servidor === servidorFiltro : true
    const matchStatus = statusFiltro ? cliente.status === statusFiltro : true

    return matchFiltro && matchServidor && matchStatus
  })

  function formatarData(dataString: string) {
    const data = new Date(dataString)
    return data.toLocaleDateString("pt-BR")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou whatsapp..."
            className="pl-8"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
        <Select value={servidorFiltro} onValueChange={setServidorFiltro}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Servidor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os servidores</SelectItem>
            {servidores.map((servidor) => (
              <SelectItem key={servidor.id} value={servidor.nome}>
                {servidor.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="hidden md:table-cell">Plano</TableHead>
              <TableHead className="hidden md:table-cell">Servidor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Carregando clientes...
                </TableCell>
              </TableRow>
            ) : clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              clientesFiltrados.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell>{cliente.whatsapp}</TableCell>
                  <TableCell>{formatarData(cliente.data_vencimento)}</TableCell>
                  <TableCell className="hidden md:table-cell">{cliente.plano}</TableCell>
                  <TableCell className="hidden md:table-cell">{cliente.servidor}</TableCell>
                  <TableCell>
                    <Badge variant={cliente.status === "ativo" ? "default" : "destructive"}>
                      {cliente.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/clientes/${cliente.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver cliente</span>
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/clientes/${cliente.id}/editar`}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar cliente</span>
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
