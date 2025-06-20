import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ConfigProvider } from "@/components/config-provider"
import { Toaster } from "@/components/ui/toaster"
import { HydrationSafe } from "@/components/hydration-safe"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "IPTV Manager",
  description: "Sistema de gerenciamento de clientes IPTV",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem 
        >
          <ConfigProvider>
            <HydrationSafe />
          {children}
            <Toaster />
          </ConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
