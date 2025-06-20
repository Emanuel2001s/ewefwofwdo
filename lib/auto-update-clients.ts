import { executeQuery } from "./db"
import { OkPacket } from "mysql2"

export async function updateExpiredClients(): Promise<{ updated: number; message: string }> {
  try {
    // Atualizar automaticamente clientes vencidos para inativo
    const result = await executeQuery(`
      UPDATE clientes 
      SET status = 'inativo' 
      WHERE DATE(data_vencimento) < CURDATE() 
      AND status = 'ativo'
    `) as OkPacket

    const updated = result.affectedRows || 0
    
    if (updated > 0) {
      console.log(`🔄 Auto-atualização: ${updated} cliente(s) vencido(s) atualizado(s) para inativo`)
    }

    return {
      updated,
      message: updated > 0 
        ? `${updated} cliente(s) vencido(s) atualizado(s) automaticamente`
        : "Nenhum cliente vencido encontrado"
    }
  } catch (error) {
    console.error("Erro ao atualizar clientes vencidos automaticamente:", error)
    return {
      updated: 0,
      message: "Erro na atualização automática"
    }
  }
} 