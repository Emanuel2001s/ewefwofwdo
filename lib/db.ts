import * as mysql from "mysql2/promise"
import { RowDataPacket, OkPacket } from "mysql2/promise"

// Cache simples para consultas frequentes
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 segundos

// Tipagem para o objeto global que armazenará o pool
declare const global: {
  mysqlPool: mysql.Pool | null;
};

// Configuração do pool de conexões
const dbConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dashboard_iptv',
  connectionLimit: 10, // Aumentado para 10 para melhor performance
  queueLimit: 20,
  waitForConnections: true,
  idleTimeout: 60000, // 1 minuto
  multipleStatements: false,
  charset: 'utf8mb4',
  timezone: '-03:00', // Configuração para horário de Brasília
  dateStrings: true // Força o MySQL a retornar datas como strings no formato YYYY-MM-DD HH:mm:ss
}

// Função para obter o pool de conexões (Singleton Pattern)
function getPool(): mysql.Pool {
  if (global.mysqlPool) {
    return global.mysqlPool;
  }

    try {
    const pool = mysql.createPool(dbConfig);
    console.log('✅ Novo Pool de Conexões MySQL criado.');
    
    // Configurar eventos do pool para monitoramento
    pool.on('connection', (connection) => {
      console.log(`🔌 Nova conexão MySQL estabelecida com ID ${connection.threadId}`);
      // Configurar timezone para cada nova conexão
      connection.query("SET time_zone='-03:00';");
    });
    
    pool.on('release', (connection) => {
      console.log(`💧 Conexão MySQL ${connection.threadId} liberada.`);
    });

    global.mysqlPool = pool;
    return pool;
    } catch (error) {
    console.error('❌ Erro ao criar pool de conexões MySQL:', error);
    throw new Error('Falha ao inicializar pool de conexões do banco de dados');
  }
}

// Inicializa o pool global
let pool = getPool();

// Function para fechar o pool
export async function closePool() {
  if (global.mysqlPool) {
    await global.mysqlPool.end();
    global.mysqlPool = null;
    console.log('Pool de conexões MySQL fechado');
  }
}

function getCacheKey(query: string, params?: any[]): string {
  return `${query}:${JSON.stringify(params || [])}`
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL
}

// Função principal para executar queries
export async function executeQuery(
  query: string,
  params: any[] = [],
  noCache: boolean = false
) {
  // Verificar se deve pular conexão com banco durante build
  if (process.env.SKIP_DB === 'true') {
    console.log('🚫 SKIP_DB ativo - Pulando execução da query:', query.substring(0, 50) + '...')
    // Retornar dados mock baseados no tipo de query
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      return [] // Array vazio para SELECTs
    } else {
      return { affectedRows: 0, insertId: 0 } // Mock para INSERT/UPDATE/DELETE
    }
  }

  // Validar parâmetros
  if (!query?.trim()) {
    throw new Error("Query não pode ser vazia")
  }

  if (!Array.isArray(params)) {
    throw new Error("Parâmetros devem ser um array")
  }

  // Verificar se há parâmetros undefined
  if (params.some(param => param === undefined)) {
    console.error("❌ Parâmetros da query contêm undefined:", params)
    throw new Error("Parâmetros da query não podem conter undefined")
  }

  const cacheKey = `${query}_${JSON.stringify(params)}`

  // Verifica o cache primeiro, a menos que noCache seja true
  if (!noCache && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Retornando dados do cache para a query:', query)
      return cached.data
    } else {
      cache.delete(cacheKey) // Remove cache expirado
    }
  }

  let connection: mysql.PoolConnection | null = null
  try {
    connection = await pool.getConnection();
    
    console.log("📝 Executando query:", query)
    console.log("📝 Parâmetros:", params)
    
    const [rows] = await connection.execute(query, params);

    // Armazenar no cache apenas queries SELECT
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      console.log('Armazenando resultado no cache para a query:', query)
      cache.set(cacheKey, { data: rows, timestamp: Date.now() })
    } else {
      // Limpar cache relacionado quando há modificações
      const tableName = extractTableName(query)
      if (tableName) {
        // Limpar cache inline em vez de chamar função separada
        for (const key of cache.keys()) {
          if (key.toLowerCase().includes(tableName.toLowerCase())) {
            cache.delete(key)
          }
        }
      }
    }

    // Verifica se o resultado é um OkPacket (para INSERT, UPDATE, DELETE)
    if (Array.isArray(rows)) {
      return rows as RowDataPacket[]
    } else {
      return rows as OkPacket
    }
  } catch (error: any) {
    console.error("❌ Erro ao executar query:", error)
    console.error("Query:", query)
    console.error("Parâmetros:", params)
    console.error("Stack trace:", error.stack)
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new Error("Violação de chave estrangeira - registro referenciado não existe")
    } else if (error.code === 'ER_DUP_ENTRY') {
      throw new Error("Registro duplicado - já existe um registro com esses dados")
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
      throw new Error("Campo obrigatório não pode ser nulo")
    } else {
      throw new Error(`Erro ao executar operação no banco de dados: ${error.message}`)
    }
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Função para extrair nome da tabela da query
function extractTableName(query: string): string | null {
  const upperQuery = query.trim().toUpperCase()
  let match: RegExpMatchArray | null = null
  
  if (upperQuery.startsWith('INSERT INTO')) {
    match = upperQuery.match(/INSERT INTO\s+(\w+)/)
  } else if (upperQuery.startsWith('UPDATE')) {
    match = upperQuery.match(/UPDATE\s+(\w+)/)
  } else if (upperQuery.startsWith('DELETE FROM')) {
    match = upperQuery.match(/DELETE FROM\s+(\w+)/)
  }
  
  return match ? match[1].toLowerCase() : null
}

// Função para criar conexão com o banco de dados (mantida para compatibilidade)
async function getConnection() {
  try {
    // Configuração específica para conexão única (sem opções de pool)
    const singleConnectionConfig: mysql.ConnectionOptions = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dashboard_iptv',
      charset: 'utf8mb4'
    }
    const connection = await mysql.createConnection(singleConnectionConfig)
    return connection
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error)
    throw new Error("Falha na conexão com o banco de dados")
  }
}

// Função para inicializar o banco de dados (criar tabelas se não existirem)
export async function initDatabase() {
  try {
    // Criar tabela de usuários
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        senha VARCHAR(255),
        tipo ENUM('admin', 'cliente') DEFAULT 'cliente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Criar tabela de servidores
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS servidores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL
      )
    `)

    // Criar tabela de planos
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS planos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        valor DECIMAL(10, 2) NOT NULL
      )
    `)

    // Criar tabela de clientes
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100),
        whatsapp VARCHAR(20),
        data_vencimento DATE,
        data_ativacao DATE,
        ultima_renovacao DATE,
        plano_id INT,
        servidor_id INT,
        observacoes TEXT,
        dispositivos SET('TV', 'Celular', 'PC', 'Notebook'),
        usuario VARCHAR(50) UNIQUE,
        senha VARCHAR(255),
        status ENUM('ativo', 'inativo') DEFAULT 'ativo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (plano_id) REFERENCES planos(id),
        FOREIGN KEY (servidor_id) REFERENCES servidores(id)
      )
    `)

    console.log("Banco de dados inicializado com sucesso")
  } catch (error) {
    console.error("Erro ao inicializar banco de dados:", error)
  }
}
