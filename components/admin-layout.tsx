"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Server, Package, BarChart3, Settings, LogOut, Menu, Moon, Sun, User, Shield, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { logout } from "@/lib/auth"
import { useConfig } from "@/components/config-provider"

interface AdminLayoutProps {
  children: React.ReactNode
  user: {
    id: number
    nome: string
    email: string
    tipo: string
  }
}

export function AdminLayout({ children, user }: AdminLayoutProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { nomeSistema, mounted } = useConfig()

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600" },
    { name: "Clientes", href: "/admin/clientes", icon: Users, color: "from-blue-500 to-blue-600" },
    { name: "Servidores", href: "/admin/servidores", icon: Server, color: "from-blue-500 to-blue-600" },
    { name: "Planos", href: "/admin/planos", icon: Package, color: "from-blue-500 to-blue-600" },
    { name: "Relatórios", href: "/admin/relatorios", icon: BarChart3, color: "from-blue-500 to-blue-600" },
    { name: "Configurações", href: "/admin/configuracoes", icon: Settings, color: "from-blue-500 to-blue-600" },
  ]

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Sidebar para desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 shadow-2xl overflow-y-auto">
          {/* Header do Sidebar */}
          <div className="flex items-center justify-center h-20 flex-shrink-0 px-6 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">{nomeSistema}</h1>
            </div>
          </div>

          {/* Navegação */}
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-6 pb-4 space-y-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg transform scale-105`
                        : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-105"
                    }`}
                  >
                    <div className={`p-2 rounded-lg mr-3 ${
                      isActive 
                        ? "bg-white/20 backdrop-blur-sm" 
                        : "bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
                    }`}>
                      <item.icon
                        className={`h-5 w-5 ${
                          isActive ? "text-white" : "text-gray-600 dark:text-gray-400"
                        }`}
                      />
                    </div>
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Perfil do usuário */}
          <div className="flex-shrink-0 border-t border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 shadow-inner">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Shield className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.nome}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Administrador
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Barra superior */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border-b border-gray-200/50 dark:border-gray-700/50">
          <button 
            type="button" 
            className="px-4 lg:hidden flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mx-2 my-4 transition-colors" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
          
          <div className="flex-1 px-4 flex items-center">
            {/* Título da página em mobile */}
            <div className="lg:hidden">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {nomeSistema}
              </h1>
            </div>
            
            {/* Espaçador para empurrar os botões para a direita */}
            <div className="flex-1"></div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme} 
                className="h-10 w-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              >
{mounted && theme === "dark" ? (
                  <Sun className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-500" />
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                className="h-10 w-10 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Menu móvel */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 flex z-40 lg:hidden">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative flex-1 flex flex-col max-w-sm w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl">
              {/* Header do Menu Móvel */}
              <div className="flex items-center justify-center h-20 flex-shrink-0 px-6 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-white">{nomeSistema}</h1>
                </div>
              </div>

              {/* Navegação Móvel */}
              <div className="mt-8 flex-grow flex flex-col">
                <nav className="flex-1 px-6 pb-4 space-y-3">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                          isActive
                            ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                            : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className={`p-2 rounded-lg mr-3 ${
                          isActive 
                            ? "bg-white/20 backdrop-blur-sm" 
                            : "bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
                        }`}>
                          <item.icon
                            className={`h-5 w-5 ${
                              isActive ? "text-white" : "text-gray-600 dark:text-gray-400"
                            }`}
                          />
                        </div>
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Perfil do usuário móvel */}
              <div className="flex-shrink-0 border-t border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 shadow-inner">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                      <Shield className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.nome}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Administrador
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo da página */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
