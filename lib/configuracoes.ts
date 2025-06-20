import { executeQuery } from './db'
import { RowDataPacket } from 'mysql2'
import bcrypt from 'bcryptjs'

export interface Configuracao {
  id: number
  chave: string
  valor: string
  descricao: string
  created_at: string
  updated_at: string
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
        valor: 'Dashboard IPTV',
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
      }
    ]

    for (const config of configuracoesPadrao) {
      await executeQuery(
        'INSERT IGNORE INTO configuracoes (chave, valor, descricao) VALUES (?, ?, ?)',
        [config.chave, config.valor, config.descricao]
      )
    }

    console.log('Tabela de configurações inicializada com sucesso')
  } catch (error) {
    console.error('Erro ao inicializar configurações:', error)
  }
}

// Buscar configuração por chave
export async function getConfiguracao(chave: string): Promise<string | null> {
  try {
    const result = await executeQuery(
      'SELECT valor FROM configuracoes WHERE chave = ?',
      [chave]
    ) as RowDataPacket[]
    
    return result.length > 0 ? result[0].valor : null
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

// Atualizar configuração
export async function updateConfiguracao(chave: string, valor: string): Promise<boolean> {
  try {
    await executeQuery(
      'UPDATE configuracoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE chave = ?',
      [valor, chave]
    )
    return true
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error)
    return false
  }
}

// Funções específicas para configurações comuns
export async function getNomeSistema(): Promise<string> {
  const nome = await getConfiguracao('nome_sistema')
  return nome || 'Dashboard IPTV'
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