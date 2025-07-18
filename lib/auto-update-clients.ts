import { executeQuery } from "./db"
import { OkPacket } from "mysql2"

export async function updateExpiredClients(): Promise<{ updated: number; message: string }> {
  try {
    console.log('🔄 Iniciando atualização de clientes vencidos...')
    console.log('🔍 SKIP_DB status:', process.env.SKIP_DB)
    
    // Atualizar automaticamente clientes vencidos para inativo
    const result = await executeQuery(`
      UPDATE clientes 
      SET status = 'inativo' 
      WHERE TIMESTAMP(data_vencimento) < CURRENT_TIMESTAMP()
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
    
    // Se SKIP_DB estiver ativo, não é um erro real
    if (process.env.SKIP_DB === 'true') {
      console.log('ℹ️ Erro esperado durante build com SKIP_DB ativo')
      return {
        updated: 0,
        message: "Build mode - database skipped"
      }
    }
    
    return {
      updated: 0,
      message: "Erro na atualização automática"
    }
  }
}