"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Search, ChevronLeft, ChevronRight } from "lucide-react"

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

interface TabelaVencimentosPaginadaProps {
  clientes: Cliente[]
}

export function TabelaVencimentosPaginada({ clientes }: TabelaVencimentosPaginadaProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState("")
  const [vencimentoFilter, setVencimentoFilter] = useState("proximos")

  // Filtrar clientes com vencimento próximo
  const filteredClientes = useMemo(() => {
    let baseFilter = clientes.filter(cliente => {
      if (vencimentoFilter === "proximos") {
        return cliente.dias_vencimento <= 7 // Próximos 7 dias
      } else if (vencimentoFilter === "vencidos") {
        return cliente.dias_vencimento < 0 // Já vencidos
      } else if (vencimentoFilter === "hoje") {
        return cliente.dias_vencimento === 0 // Vencem hoje
      }
      return cliente.dias_vencimento <= 7 // Default: próximos
    })

    return baseFilter.filter(cliente => {
      const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cliente.whatsapp.includes(searchTerm) ||
                           cliente.plano_nome.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [clientes, searchTerm, vencimentoFilter])

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

  const handleVencimentoChange = (value: string) => {
    setVencimentoFilter(value)
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
          <Calendar className="h-5 w-5" />
          Clientes com Vencimento Próximo ou Vencidos
        </CardTitle>
        
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, WhatsApp ou plano..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={vencimentoFilter} onValueChange={handleVencimentoChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar vencimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proximos">Próximos 7 dias</SelectItem>
              <SelectItem value="hoje">Vencem hoje</SelectItem>
              <SelectItem value="vencidos">Já vencidos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[120px]">
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
      </CardHeader>
      
      <CardContent>
        {/* Informações da paginação */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredClientes.length)} de {filteredClientes.length} clientes
            {searchTerm && ` (filtrados)`}
          </p>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Cliente</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">WhatsApp</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Plano</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Valor</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Vencimento</th>
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Situação</th>
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
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      cliente.dias_vencimento < 0 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        : cliente.dias_vencimento <= 3
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                    }`}>
                      {cliente.dias_vencimento < 0 
                        ? `${Math.abs(cliente.dias_vencimento)} dias em atraso`
                        : cliente.dias_vencimento === 0
                        ? 'Vence hoje'
                        : `Vence em ${cliente.dias_vencimento} dias`
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Controles de paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
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
              className="flex items-center gap-2"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mensagem quando não há resultados */}
        {filteredClientes.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm 
                ? "Nenhum cliente encontrado com os filtros aplicados" 
                : "Nenhum cliente com vencimento próximo"
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 