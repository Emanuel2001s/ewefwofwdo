import type React from "react"
import { redirect } from "next/navigation"
import { ClienteLayout } from "@/components/cliente-layout"
import { requireAuth } from "@/lib/auth"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth("cliente")

  if (!user || user.tipo !== "cliente") {
    redirect("/login?type=cliente")
  }

  return <ClienteLayout user={user}>{children}</ClienteLayout>
}
