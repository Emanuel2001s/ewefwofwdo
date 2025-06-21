import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "full"
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-4xl",
  xl: "max-w-7xl",
  full: "max-w-none"
}

export function ResponsiveContainer({ 
  children, 
  size = "xl", 
  className, 
  ...props 
}: ResponsiveContainerProps) {
  return (
    <div 
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        sizeClasses[size],
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsivePageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  children?: React.ReactNode
}

export function ResponsivePageHeader({ 
  title, 
  description, 
  children, 
  className, 
  ...props 
}: ResponsivePageHeaderProps) {
  return (
    <div className={cn("mb-6 sm:mb-8", className)} {...props}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-col sm:flex-row gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, sm: 2, lg: 4 }, 
  className, 
  ...props 
}: ResponsiveGridProps) {
  const gridClasses = []
  
  if (cols.default) gridClasses.push(`grid-cols-${cols.default}`)
  if (cols.sm) gridClasses.push(`sm:grid-cols-${cols.sm}`)  
  if (cols.md) gridClasses.push(`md:grid-cols-${cols.md}`)
  if (cols.lg) gridClasses.push(`lg:grid-cols-${cols.lg}`)
  if (cols.xl) gridClasses.push(`xl:grid-cols-${cols.xl}`)
  
  return (
    <div 
      className={cn(
        "grid gap-4 sm:gap-6",
        gridClasses.join(" "),
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
} 