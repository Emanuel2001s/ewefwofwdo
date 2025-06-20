'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

interface Props {
  children: React.ReactNode
  attribute?: any
  defaultTheme?: string
  enableSystem?: boolean
}

export function ThemeProvider({ children, attribute, defaultTheme, enableSystem }: Props) {
  return (
    <NextThemesProvider 
      attribute={attribute} 
      defaultTheme={defaultTheme} 
      enableSystem={enableSystem}
    >
      {children}
    </NextThemesProvider>
  )
}
