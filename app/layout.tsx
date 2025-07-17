import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ConfigProvider } from "@/components/config-provider"
import { Toaster } from "@/components/ui/toaster"
import { HydrationSafe } from "@/components/hydration-safe"
import { InstantTitle } from "@/components/instant-title"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Sistema de gerenciamento IPTV",
  generator: 'v0.dev'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className={inter.className}>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="light" 
            enableSystem
          >
            <ConfigProvider>
              <HydrationSafe>
                <InstantTitle />
                {children}
                <Toaster />
              </HydrationSafe>
            </ConfigProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
