"use server"

import mysql from "mysql2/promise"

// Configuração da conexão com o banco de dados
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "iptv_manager",
}

// Função para criar conexão com o banco de dados
async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    return connection
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error)
    throw new Error("Falha na conexão com o banco de dados")
  }
}

// Função para executar queries
export async function executeQuery(query: string, params: any[] = []) {
  let connection

  try {
    connection = await getConnection()
    const [rows] = await connection.execute(query, params)
    return rows as any[]
  } catch (error) {
    console.error("Erro ao executar query:", error)
    throw new Error("Falha ao executar operação no banco de dados")
  } finally {
    if (connection) {
      await connection.end()
    }
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
        tipo ENUM('admin', 'cliente') DEFAULT 'cliente'
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
        plano_id INT,
        servidor_id INT,
        observacoes TEXT,
        dispositivos SET('TV', 'Celular', 'PC', 'Notebook'),
        usuario_id INT,
        status ENUM('ativo', 'inativo') DEFAULT 'ativo',
        FOREIGN KEY (plano_id) REFERENCES planos(id),
        FOREIGN KEY (servidor_id) REFERENCES servidores(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `)

    console.log("Banco de dados inicializado com sucesso")
  } catch (error) {
    console.error("Erro ao inicializar banco de dados:", error)
  }
}
