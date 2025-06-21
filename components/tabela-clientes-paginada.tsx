"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface Cliente {
  id: number
  nome: string
  whatsapp: string
  plano_nome: string
  plano_valor: number
  data_vencimento: string
  status: string
  servidor_nome: string
  dias_vencimento: number
}

interface TabelaClientesPaginadaProps {
  clientes: Cliente[]
}

export function TabelaClientesPaginada({ clientes }: TabelaClientesPaginadaProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")

  // Filtrar clientes
  const filteredClientes = useMemo(() => {
    return clientes.filter(cliente => {
      const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cliente.whatsapp.includes(searchTerm) ||
                           cliente.plano_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cliente.servidor_nome.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === "todos" || cliente.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [clientes, searchTerm, statusFilter])

  // Calcular paginação
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentClientes = filteredClientes.slice(startIndex, endIndex)

  // Reset página quando filtros mudam
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Relatório Detalhado de Clientes
        </CardTitle>
        
        {/* Filtros */}
        <div className="space-y-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, WhatsApp, plano ou servidor..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativo">Apenas ativos</SelectItem>
                <SelectItem value="inativo">Apenas inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Informações da paginação */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredClientes.length)} de {filteredClientes.length} clientes
            {searchTerm && ` (filtrados de ${clientes.length} total)`}
          </p>
        </div>

        {/* Tabela Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Cliente</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">WhatsApp</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Plano</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Valor</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Vencimento</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Servidor</th>
              </tr>
            </thead>
            <tbody>
              {currentClientes.map((cliente, index) => (
                <tr key={cliente.id} className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}>
                  <td className="p-3 text-gray-900 dark:text-white">{cliente.nome}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{cliente.whatsapp}</td>
                  <td className="p-3 text-gray-900 dark:text-white">{cliente.plano_nome}</td>
                  <td className="p-3 text-gray-900 dark:text-white">
                    {Number(cliente.plano_valor || 0).toLocaleString("pt-BR", { 
                      style: "currency", 
                      currency: "BRL" 
                    })}
                  </td>
                  <td className="p-3 text-gray-900 dark:text-white">
                    {new Date(cliente.data_vencimento).toLocaleDateString("pt-BR")}
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                      cliente.dias_vencimento < 0 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        : cliente.dias_vencimento <= 7
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    }`}>
                      {cliente.dias_vencimento < 0 ? `${Math.abs(cliente.dias_vencimento)} dias em atraso` : `${cliente.dias_vencimento} dias`}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      cliente.status === 'ativo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {cliente.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{cliente.servidor_nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards Mobile */}
        <div className="md:hidden space-y-4">
          {currentClientes.map((cliente) => (
            <Card key={cliente.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {cliente.nome}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {cliente.whatsapp}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    cliente.status === 'ativo' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {cliente.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Plano:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{cliente.plano_nome}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Valor:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Number(cliente.plano_valor || 0).toLocaleString("pt-BR", { 
                        style: "currency", 
                        currency: "BRL" 
                      })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Servidor:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{cliente.servidor_nome}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Vencimento:</span>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {new Date(cliente.data_vencimento).toLocaleDateString("pt-BR")}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        cliente.dias_vencimento < 0 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                          : cliente.dias_vencimento <= 7
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      }`}>
                        {cliente.dias_vencimento < 0 ? `${Math.abs(cliente.dias_vencimento)} dias em atraso` : `${cliente.dias_vencimento} dias`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controles de paginação */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
              <span className="sm:hidden">Ant</span>
            </Button>

            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 7) {
                  pageNumber = i + 1;
                } else if (currentPage <= 4) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNumber = totalPages - 6 + i;
                } else {
                  pageNumber = currentPage - 3 + i;
                }

                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <span className="hidden sm:inline">Próximo</span>
              <span className="sm:hidden">Prox</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mensagem quando não há resultados */}
        {filteredClientes.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== "todos" 
                ? "Nenhum cliente encontrado com os filtros aplicados" 
                : "Nenhum cliente cadastrado"
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 