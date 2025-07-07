import { NextRequest, NextResponse } from 'next/server'
import { verifyEvolutionPermissions } from '@/lib/admin-middleware'
import { executeQuery } from '@/lib/db'

/**
 * POST - Verificar e criar tabela message_history se não existir
 */
export async function POST(request: NextRequest) {
  try {
    await verifyEvolutionPermissions()
    
    console.log('🔧 Verificando estrutura da tabela message_history...')
    
    // Verificar se a tabela existe
    const checkTable = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND table_name = 'message_history'
    `)
    
    const tableExists = Array.isArray(checkTable) && checkTable[0]?.count > 0
    
    if (!tableExists) {
      console.log('⚠️ Tabela message_history não encontrada. Criando...')
      
      // Criar a tabela message_history
      await executeQuery(`
        CREATE TABLE message_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cliente_id INT,
          instancia_id INT NOT NULL,
          template_id INT,
          numero_whatsapp VARCHAR(20) NOT NULL,
          message_type ENUM('texto', 'imagem') NOT NULL DEFAULT 'texto',
          mensagem_enviada TEXT NOT NULL,
          imagem_enviada VARCHAR(500),
          status ENUM('enviando', 'enviada', 'erro', 'lida') DEFAULT 'enviando',
          response_data JSON,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_cliente_id (cliente_id),
          INDEX idx_instancia_id (instancia_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (instancia_id) REFERENCES evolution_instancias(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      
      console.log('✅ Tabela message_history criada com sucesso!')
    } else {
      console.log('✅ Tabela message_history já existe.')
    }
    
    // Verificar estrutura da tabela
    const tableStructure = await executeQuery(`
      DESCRIBE message_history
    `)
    
    return NextResponse.json({
      success: true,
      message: tableExists ? 'Tabela já existia' : 'Tabela criada com sucesso',
      table_exists: tableExists,
      structure: tableStructure
    })
    
  } catch (error) {
    console.error('Erro ao verificar/criar tabela message_history:', error)
    return NextResponse.json({
      error: "Erro ao verificar estrutura do banco",
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 