"use server"

import { getAuthUser } from "./auth"
import { redirect } from "next/navigation"

/**
 * Middleware para verificar se o usuário é o Admin Supremo (ID = 1)
 * Usado para proteger todas as funcionalidades da Evolution API
 */
export async function requireAdminSupremo() {
  const user = await getAuthUser()
  
  if (!user) {
    redirect("/")
  }
  
  if (user.tipo !== "admin") {
    redirect("/")
  }
  
  if (user.id !== 1) {
    redirect("/admin/dashboard")
  }
  
  return user
}

/**
 * Verificação mais simples para uso em componentes
 */
export async function isAdminSupremo(): Promise<boolean> {
  try {
    const user = await getAuthUser()
    return user?.tipo === "admin" && Number(user?.id) === 1
  } catch {
    return false
  }
}

/**
 * Helper para verificar permissões Evolution em APIs
 */
export async function verifyEvolutionPermissions() {
  const user = await getAuthUser()
  
  if (!user || user.tipo !== "admin" || user.id !== 1) {
    throw new Error("Acesso negado: Apenas o Admin Supremo pode acessar funcionalidades do WhatsApp")
  }
  
  return user
} 