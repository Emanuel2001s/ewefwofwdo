"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, LogOut, Menu, Moon, Sun, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { logout } from "@/lib/auth"
import { useConfig } from "@/components/config-provider"

interface ClienteLayoutProps {
  children: React.ReactNode
  user: {
    id: number
    nome: string
    email: string
    tipo: string
  }
}

export function ClienteLayout({ children, user }: ClienteLayoutProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { nomeSistema } = useConfig()

  useEffect(() => {
    setMounted(true)
  }, [])

  const navigation = [
    { name: "Dashboard", href: "/cliente/dashboard", icon: LayoutDashboard },
    { name: "Configurações", href: "/cliente/configuracoes", icon: Settings },
  ]

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900">
      {/* Sidebar para desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto">
          <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 bg-blue-600 dark:bg-blue-800">
            <h1 className="text-xl font-bold text-white">{nomeSistema}</h1>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                        : "text-gray-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20"
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        isActive ? "text-blue-600 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"
                      }`}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-slate-800 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white">
                  <User className="h-4 w-4" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Barra superior */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-slate-950 shadow dark:shadow-slate-800/50">
          <button type="button" className="px-4 md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="flex-1 px-4 flex justify-end">
            <div className="ml-4 flex items-center md:ml-6 space-x-3">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
                {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Menu móvel */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 flex z-40 md:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-slate-950">
              <div className="flex items-center justify-center h-16 flex-shrink-0 px-4 bg-blue-600 dark:bg-blue-800">
                <h1 className="text-xl font-bold text-white">{nomeSistema}</h1>
              </div>
              <div className="mt-5 flex-grow flex flex-col">
                <nav className="flex-1 px-2 pb-4 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                            : "text-gray-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <item.icon
                          className={`mr-3 flex-shrink-0 h-5 w-5 ${
                            isActive ? "text-blue-600 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"
                          }`}
                        />
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>
              </div>
              <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-slate-800 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center text-white">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo da página */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
