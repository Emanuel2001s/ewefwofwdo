import { ClienteForm } from "@/components/cliente-form"
import { executeQuery } from "@/lib/db"
import { RowDataPacket } from "mysql2"

// Força dynamic rendering para evitar execução durante o build
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getServidores() {
  const result = await executeQuery("SELECT id, nome FROM servidores ORDER BY nome ASC") as RowDataPacket[]
  return result as { id: number; nome: string; }[]
}

async function getPlanos() {
  const result = await executeQuery("SELECT id, nome, valor, duracao_dias FROM planos ORDER BY nome ASC") as RowDataPacket[]
  return result as { id: number; nome: string; valor: number; duracao_dias: number; }[]
}

export default async function NovoClientePage() {
  const servidores = await getServidores()
  const planos = await getPlanos()

  return (
    <ClienteForm servidores={servidores} planos={planos} />
  )
}
