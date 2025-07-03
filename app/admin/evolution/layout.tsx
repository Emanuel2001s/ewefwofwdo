import { redirect } from 'next/navigation'
import { requireAdminSupremo } from '@/lib/admin-middleware'
import { AdminLayout } from '@/components/admin-layout'

// Navegação específica da área Evolution
const evolutionNavigation = [
  {
    name: "Dashboard WhatsApp",
    href: "/admin/evolution/dashboard",
    icon: "BarChart3",
    color: "from-green-500 to-green-600"
  },
  {
    name: "Instâncias",
    href: "/admin/evolution/instancias",
    icon: "Smartphone",
    color: "from-green-500 to-green-600"
  },
  {
    name: "Templates",
    href: "/admin/evolution/templates",
    icon: "FileText",
    color: "from-green-500 to-green-600"
  },
  {
    name: "Mensagens",
    href: "/admin/evolution/mensagens",
    icon: "MessageCircle",
    color: "from-green-500 to-green-600"
  },
  {
    name: "Configurações",
    href: "/admin/evolution/configuracoes",
    icon: "Settings",
    color: "from-green-500 to-green-600"
  }
]

export default async function EvolutionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar se é admin supremo - redireciona se não for
  try {
    await requireAdminSupremo()
  } catch {
    redirect('/admin/dashboard')
  }

  return (
    <AdminLayout 
      additionalNavigation={evolutionNavigation}
      sectionTitle="WhatsApp Evolution"
      sectionColor="green"
    >
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {children}
      </div>
    </AdminLayout>
  )
} 