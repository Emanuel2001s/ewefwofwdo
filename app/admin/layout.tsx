import type React from "react"
import { redirect } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { requireAuth } from "@/lib/auth"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth("admin")

  if (!user || user.tipo !== "admin") {
    redirect("/")
  }

  return <AdminLayout user={user}>{children}</AdminLayout>
}
