import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Gerenciar Clientes',
  description: 'Controle total dos seus clientes IPTV',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function ClientesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 