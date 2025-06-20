const mysql = require('mysql2/promise');
const path = require('path');

// Carregar variáveis de ambiente se disponível
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
} catch (error) {
  // Ignorar se dotenv não estiver disponível
}

// Configuração do banco de dados para conexão única
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iptv_manager',
  port: process.env.DB_PORT || 3306,
  connectTimeout: 30000, // Timeout para estabelecer conexão
};

async function updateExpiredClients() {
  let connection;
  
  try {
    const timestamp = new Date().toISOString();
    console.log(`🕐 [${timestamp}] Iniciando atualização automática de clientes vencidos...`);
    
    // Conectar ao banco
    connection = await mysql.createConnection(dbConfig);
    
    // Buscar clientes vencidos que ainda estão ativos
    const [expiredClients] = await connection.execute(`
      SELECT id, nome, data_vencimento 
      FROM clientes 
      WHERE DATE(data_vencimento) < CURDATE() 
      AND status = 'ativo'
    `);
    
    if (expiredClients.length === 0) {
      console.log('✅ Nenhum cliente vencido encontrado. Sistema atualizado.');
      return { updated: 0, message: 'Nenhum cliente vencido encontrado' };
    }
    
    console.log(`📋 Encontrados ${expiredClients.length} cliente(s) vencido(s):`);
    expiredClients.forEach(client => {
      const vencimento = new Date(client.data_vencimento).toLocaleDateString('pt-BR');
      console.log(`   - ${client.nome} (Vencimento: ${vencimento})`);
    });
    
    // Atualizar status para inativo
    const [result] = await connection.execute(`
      UPDATE clientes 
      SET status = 'inativo' 
      WHERE DATE(data_vencimento) < CURDATE() 
      AND status = 'ativo'
    `);
    
    console.log(`✅ ${result.affectedRows} cliente(s) atualizado(s) para status 'inativo'.`);
    
    // Log de auditoria
    const endTimestamp = new Date().toISOString();
    console.log(`📝 Atualização automática concluída em: ${endTimestamp}`);
    
    return { 
      updated: result.affectedRows, 
      message: `${result.affectedRows} cliente(s) atualizado(s) automaticamente`,
      clients: expiredClients.map(c => ({ id: c.id, nome: c.nome, data_vencimento: c.data_vencimento }))
    };
    
  } catch (error) {
    console.error('❌ Erro ao atualizar clientes vencidos:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  updateExpiredClients()
    .then((result) => {
      console.log('🎉 Script de atualização automática executado com sucesso!');
      console.log(`📊 Resultado: ${result.message}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na execução do script de atualização automática:', error);
      process.exit(1);
    });
}

module.exports = { updateExpiredClients }; 