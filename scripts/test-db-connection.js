#!/usr/bin/env node

/**
 * Script para testar conectividade com banco de dados
 * Uso: node scripts/test-db-connection.js
 */

const mysql = require('mysql2/promise')
require('dotenv').config()

async function testConnection() {
  console.log('🔍 Testando conectividade com banco de dados...')
  console.log('\n📋 Configurações:')
  console.log('- DB_HOST:', process.env.DB_HOST || 'não definido')
  console.log('- DB_USER:', process.env.DB_USER || 'não definido')
  console.log('- DB_NAME:', process.env.DB_NAME || 'não definido')
  console.log('- DB_PASSWORD:', process.env.DB_PASSWORD ? '***definido***' : 'não definido')
  console.log('- SKIP_DB:', process.env.SKIP_DB || 'não definido')
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'não definido')
  
  if (process.env.SKIP_DB === 'true') {
    console.log('\n🚫 SKIP_DB está ativo - conexão com banco será pulada')
    return
  }
  
  if (!process.env.DB_HOST) {
    console.error('\n❌ DB_HOST não está definido!')
    process.exit(1)
  }
  
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard_iptv',
    connectTimeout: 10000, // 10 segundos
    acquireTimeout: 10000,
    timeout: 10000
  }
  
  console.log('\n🔌 Tentando conectar...')
  
  try {
    const startTime = Date.now()
    const connection = await mysql.createConnection(config)
    const endTime = Date.now()
    
    console.log(`✅ Conexão estabelecida com sucesso! (${endTime - startTime}ms)`)
    
    // Testar uma query simples
    console.log('\n📝 Testando query simples...')
    const [rows] = await connection.execute('SELECT 1 as test, NOW() as current_time')
    console.log('✅ Query executada com sucesso:', rows)
    
    // Testar listagem de tabelas
    console.log('\n📋 Listando tabelas existentes...')
    const [tables] = await connection.execute('SHOW TABLES')
    console.log('📊 Tabelas encontradas:', tables.length)
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0]
      console.log(`  ${index + 1}. ${tableName}`)
    })
    
    await connection.end()
    console.log('\n🎉 Teste de conectividade concluído com sucesso!')
    
  } catch (error) {
    console.error('\n❌ Erro na conectividade:')
    console.error('- Código:', error.code)
    console.error('- Mensagem:', error.message)
    console.error('- Errno:', error.errno)
    console.error('- Syscall:', error.syscall)
    console.error('- Hostname:', error.hostname)
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Dica: O hostname não pôde ser resolvido. Verifique:')
      console.error('  - Se o DB_HOST está correto')
      console.error('  - Se há conectividade de rede')
      console.error('  - Se o servidor de banco está rodando')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Dica: Conexão recusada. Verifique:')
      console.error('  - Se o servidor MySQL está rodando')
      console.error('  - Se a porta está correta (padrão: 3306)')
      console.error('  - Se o firewall permite a conexão')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Dica: Acesso negado. Verifique:')
      console.error('  - Se o usuário e senha estão corretos')
      console.error('  - Se o usuário tem permissões no banco')
    }
    
    process.exit(1)
  }
}

// Executar o teste
testConnection().catch(console.error)