import { executeQuery } from './db'
import { RowDataPacket } from 'mysql2'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export interface Configuracao {
  id: number
  chave: string
  valor: string
  descricao: string
  created_at: string
  updated_at: string
}

// Configurações de criptografia
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '32characterslongencryptionkey123'
const ALGORITHM = 'aes-256-cbc'

// Lista de chaves que devem ser criptografadas
const SENSITIVE_KEYS = ['evolution_api_key', 'admin_password']

// Criptografar dado sensível
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// Descriptografar dado sensível
function decrypt(text: string): string {
  try {
    const textParts = text.split(':')
    if (textParts.length !== 2) {
      // Dados não criptografados (compatibilidade)
      return text
    }
    const iv = Buffer.from(textParts[0], 'hex')
    const encryptedText = textParts[1]
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Erro ao descriptografar:', error)
    return text // Retorna o texto original se falhar (compatibilidade com dados não criptografados)
  }
}

// Verificar se uma chave é sensível
function isSensitiveKey(chave: string): boolean {
  return SENSITIVE_KEYS.includes(chave)
}

// Criar tabela se não existir
export async function initConfiguracoes() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chave VARCHAR(100) NOT NULL UNIQUE,
        valor TEXT NOT NULL,
        descricao VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Inserir configurações padrão se não existirem (apenas sistema, não admin)
    const configuracoesPadrao = [
      {
        chave: 'nome_sistema',
        valor: 'Dashboard',
        descricao: 'Nome do sistema exibido em todas as páginas'
      },
      {
        chave: 'favicon_url',
        valor: '/favicon.ico',
        descricao: 'URL do favicon do sistema'
      },
      {
        chave: 'logo_url',
        valor: '/placeholder-logo.png',
        descricao: 'URL da logo exibida na página de login'
      },
      {
        chave: 'notificacao_horario',
        valor: '08:00',
        descricao: 'Horário para atualização automática dos clientes vencidos (formato HH:mm)'
      }
    ]

    for (const config of configuracoesPadrao) {
      await executeQuery(
        'INSERT IGNORE INTO configuracoes (chave, valor, descricao) VALUES (?, ?, ?)',
        [config.chave, config.valor, config.descricao]
      )
    }

    console.log('Tabela de configurações inicializada com sucesso')
    
    // Migrar dados sensíveis existentes para formato criptografado
    await migrateSensitiveData()
  } catch (error) {
    console.error('Erro ao inicializar configurações:', error)
  }
}

// Migrar dados sensíveis existentes para formato criptografado
async function migrateSensitiveData() {
  try {
    for (const sensitiveKey of SENSITIVE_KEYS) {
      const result = await executeQuery(
        'SELECT valor FROM configuracoes WHERE chave = ?',
        [sensitiveKey]
      ) as RowDataPacket[]
      
      if (result.length > 0) {
        const currentValue = result[0].valor
        
        // Verificar se já está criptografado (tem formato iv:encrypted)
        if (currentValue && !currentValue.includes(':')) {
          console.log(`🔐 Criptografando ${sensitiveKey} existente...`)
          const encryptedValue = encrypt(currentValue)
          
          await executeQuery(
            'UPDATE configuracoes SET valor = ? WHERE chave = ?',
            [encryptedValue, sensitiveKey]
          )
          
          console.log(`✅ ${sensitiveKey} criptografado com sucesso`)
        }
      }
    }
  } catch (error) {
    console.error('Erro na migração de dados sensíveis:', error)
  }
}

// Buscar configuração por chave
export async function getConfiguracao(chave: string): Promise<string | null> {
  try {
    const result = await executeQuery(
      'SELECT valor FROM configuracoes WHERE chave = ?',
      [chave]
    ) as RowDataPacket[]
    
    if (result.length === 0) return null
    
    const valor = result[0].valor
    
    // Descriptografar se for dado sensível
    if (isSensitiveKey(chave)) {
      return decrypt(valor)
    }
    
    return valor
  } catch (error) {
    console.error('Erro ao buscar configuração:', error)
    return null
  }
}

// Buscar todas as configurações
export async function getAllConfiguracoes(): Promise<Configuracao[]> {
  try {
    const result = await executeQuery(
      'SELECT * FROM configuracoes ORDER BY chave'
    ) as RowDataPacket[]
    
    return result as Configuracao[]
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return []
  }
}

// Limpar cache específico de configurações
function clearConfigurationsCache() {
  if (typeof require !== 'undefined') {
    try {
      const { executeQuery } = require('./db')
      // Força uma nova consulta sem cache na próxima vez
      executeQuery('SELECT 1', [], true) // Query dummy para limpar cache
    } catch (error) {
      // Se não conseguir limpar o cache, não é um erro crítico
      console.log('Cache clearance não disponível')
    }
  }
}

// Atualizar configuração
export async function updateConfiguracao(chave: string, valor: string): Promise<boolean> {
  try {
    // Criptografar se for dado sensível
    const valorParaSalvar = isSensitiveKey(chave) ? encrypt(valor) : valor
    
    // Verificar se a configuração já existe
    const exists = await executeQuery(
      'SELECT id FROM configuracoes WHERE chave = ?',
      [chave]
    ) as RowDataPacket[]
    
    if (exists.length > 0) {
      // Atualizar existente
      await executeQuery(
        'UPDATE configuracoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE chave = ?',
        [valorParaSalvar, chave],
        true // Não usar cache nesta query
      )
    } else {
      // Inserir novo
      await executeQuery(
        'INSERT INTO configuracoes (chave, valor, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [chave, valorParaSalvar],
        true // Não usar cache nesta query
      )
    }
    
    // **LIMPAR CACHE APÓS ATUALIZAÇÃO**
    clearConfigurationsCache()
    
    return true
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error)
    return false
  }
}

// Funções específicas para configurações comuns
export async function getNomeSistema(): Promise<string> {
  const nome = await getConfiguracao('nome_sistema')
  return nome || 'Dashboard'
}

export async function getFaviconUrl(): Promise<string> {
  const favicon = await getConfiguracao('favicon_url')
  return favicon || '/favicon.ico'
}

export async function getLogoUrl(): Promise<string> {
  const logo = await getConfiguracao('logo_url')
  return logo || '/placeholder-logo.png'
}

// Funções para o admin supremo (tabela usuarios)
export async function getAdminSupremo(): Promise<{id: number, nome: string} | null> {
  try {
    const result = await executeQuery(
      'SELECT id, nome FROM usuarios WHERE id = 1 AND tipo = ?',
      ['admin']
    ) as RowDataPacket[]
    
    return result.length > 0 ? result[0] as {id: number, nome: string} : null
  } catch (error) {
    console.error('Erro ao buscar admin supremo:', error)
    return null
  }
}

// Atualizar dados do admin supremo
export async function updateAdminSupremo(nome: string): Promise<boolean> {
  try {
    await executeQuery(
      'UPDATE usuarios SET nome = ? WHERE id = 1 AND tipo = ?',
      [nome, 'admin']
    )
    return true
  } catch (error) {
    console.error('Erro ao atualizar admin supremo:', error)
    return false
  }
}

// Atualizar senha do admin supremo
export async function updateAdminPassword(newPassword: string): Promise<boolean> {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await executeQuery(
      'UPDATE usuarios SET senha = ? WHERE id = 1 AND tipo = ?',
      [hashedPassword, 'admin']
    )
    return true
  } catch (error) {
    console.error('Erro ao atualizar senha do admin supremo:', error)
    return false
  }
}

// Função para verificar status de segurança das configurações
export async function getSecurityStatus(): Promise<{
  encryptionEnabled: boolean;
  customEncryptionKey: boolean;
  sensitiveDataEncrypted: boolean;
}> {
  try {
    const customEncryptionKey = process.env.ENCRYPTION_KEY !== undefined
    
    // Verificar se dados sensíveis estão criptografados
    let sensitiveDataEncrypted = true
    for (const sensitiveKey of SENSITIVE_KEYS) {
      const result = await executeQuery(
        'SELECT valor FROM configuracoes WHERE chave = ?',
        [sensitiveKey]
      ) as RowDataPacket[]
      
      if (result.length > 0) {
        const value = result[0].valor
        // Se não contém ':', provavelmente não está criptografado
        if (value && !value.includes(':')) {
          sensitiveDataEncrypted = false
          break
        }
      }
    }
    
    return {
      encryptionEnabled: true,
      customEncryptionKey,
      sensitiveDataEncrypted
    }
  } catch (error) {
    console.error('Erro ao verificar status de segurança:', error)
    return {
      encryptionEnabled: false,
      customEncryptionKey: false,
      sensitiveDataEncrypted: false
    }
  }
}