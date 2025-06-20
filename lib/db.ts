"use server"

import * as mysql from "mysql2/promise"
import { RowDataPacket, OkPacket } from "mysql2/promise"

// Cache simples para consultas frequentes
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 segundos

// Pool de conexões para melhor performance
let pool: mysql.Pool | null = null

// Configuração do pool de conexões
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 2, // Reduzindo para apenas 2 conexões simultâneas
  queueLimit: 0,
  multipleStatements: false,
}

// Função para obter o pool de conexões
function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
    console.log('Pool de conexões criado com limite de', dbConfig.connectionLimit, 'conexões')
    
    // Configurar eventos do pool para monitoramento
    pool.on('connection', (connection) => {
      console.log('Nova conexão estabelecida como id ' + connection.threadId)
    })
    
    pool.on('release', (connection) => {
      console.log('Conexão %d liberada', connection.threadId)
    })
  }
  return pool
}

// Function para fechar o pool
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
    console.log('Pool de conexões fechado')
  }
}

function getCacheKey(query: string, params?: any[]): string {
  return `${query}:${JSON.stringify(params || [])}`
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL
}

// Função para executar queries
export async function executeQuery(query: string, params: any[] = []): Promise<RowDataPacket[] | OkPacket> {
  // Verificar cache apenas para queries SELECT
  if (query.trim().toUpperCase().startsWith('SELECT')) {
    const cacheKey = getCacheKey(query, params)
    const cached = cache.get(cacheKey)
    
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data
    }
  }

  try {
    const pool = getPool()
    const [rows] = await pool.execute(query, params)

    // Armazenar no cache apenas queries SELECT
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      const cacheKey = getCacheKey(query, params)
      cache.set(cacheKey, {
        data: rows,
        timestamp: Date.now()
      })
      
      // Limpar cache antigo (simples garbage collection)
      if (cache.size > 100) {
        const now = Date.now()
        for (const [key, value] of cache.entries()) {
          if (!isCacheValid(value.timestamp)) {
            cache.delete(key)
          }
        }
      }
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
  } catch (error) {
    console.error("Erro ao executar query:", error)
    throw new Error("Falha ao executar operação no banco de dados")
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
    const singleConnectionConfig = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 30000, // Timeout para estabelecer conexão
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
