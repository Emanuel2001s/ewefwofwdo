import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  headers: string[]
  children: React.ReactNode
}

export function ResponsiveTable({ headers, children, className, ...props }: ResponsiveTableProps) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Tabela desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {headers.map((header, index) => (
                  <th key={index} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {children}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-4">
        {children}
      </div>
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