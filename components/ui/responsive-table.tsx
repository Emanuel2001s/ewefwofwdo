import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  pagination?: PaginationProps
  className?: string
}

export function ResponsiveTable<T extends Record<string, any>>({ 
  columns, 
  data, 
  loading = false,
  emptyMessage = "Nenhum item encontrado",
  pagination,
  className 
}: ResponsiveTableProps<T>) {
  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-lg font-medium">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Tabela desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50">
                {columns.map((column) => (
                  <th 
                    key={column.key} 
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {data.map((item, index) => (
                <tr 
                  key={index}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      className="p-4 align-middle"
                    >
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-4 p-4">
        {data.map((item, index) => (
          <div 
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm space-y-3"
          >
            {columns.map((column) => (
              <div key={column.key} className="flex flex-col space-y-1">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {column.label}
                </span>
                <div className="text-sm">
                  {column.render ? column.render(item) : item[column.key]}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Paginação */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-gray-500">
            Página {pagination.currentPage} de {pagination.totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface ResponsiveTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
  mobileCard?: React.ReactNode
}

export function ResponsiveTableRow({ children, mobileCard, className, ...props }: ResponsiveTableRowProps) {
  return (
    <>
      {/* Row desktop */}
      <tr 
        className={cn(
          "hidden md:table-row border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", 
          className
        )} 
        {...props}
      >
        {children}
      </tr>
      
      {/* Card mobile */}
      <div className="md:hidden">
        {mobileCard || (
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm">
            {children}
          </div>
        )}
      </div>
    </>
  )
}

export function ResponsiveTableCell({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td 
      className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} 
      {...props}
    >
      {children}
    </td>
  )
} 