import { executeQuery } from './db'
import { RowDataPacket } from 'mysql2'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Tipos para templates
export interface MessageTemplate {
  id: number
  nome: string
  tipo: 'vencimento' | 'pagamento' | 'boas_vindas' | 'manutencao' | 'personalizada'
  message_type: 'texto' | 'imagem'
  assunto?: string
  mensagem: string
  imagem_url?: string
  imagem_caption?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface ClienteData {
  id: number
  nome: string
  whatsapp: string
  usuario: string
  status: string
  data_vencimento: string
  data_ativacao: string
  plano: string
  valor_plano: number
  servidor: string
}

/**
 * Processa template com variáveis do cliente
 */
export async function processTemplate(
  template: MessageTemplate,
  cliente: ClienteData
): Promise<{ texto: string; imagemCaption?: string }> {
  const variables = await buildTemplateVariables(cliente)
  
  // Processar texto principal
  const texto = replaceVariables(template.mensagem, variables)
  
  // Processar caption da imagem se existir
  let imagemCaption: string | undefined
  if (template.message_type === 'imagem' && template.imagem_caption) {
    imagemCaption = replaceVariables(template.imagem_caption, variables)
  }
  
  return { texto, imagemCaption }
}

/**
 * Constrói todas as variáveis disponíveis para um cliente
 */
async function buildTemplateVariables(cliente: ClienteData): Promise<Record<string, string>> {
  const now = new Date()
  const dataVencimento = new Date(cliente.data_vencimento)
  const dataAtivacao = new Date(cliente.data_ativacao)
  
  // Calcular dias
  const diasVencimento = differenceInDays(dataVencimento, now)
  const diasDesdeAtivacao = differenceInDays(now, dataAtivacao)
  
  // Buscar nome do sistema
  const nomeSystema = await getNomeSistema()
  
  return {
    // Variáveis do cliente
    'nome': cliente.nome || '',
    'whatsapp': cliente.whatsapp || '',
    'usuario': cliente.usuario || '',
    'status': cliente.status || '',
    
    // Variáveis do plano
    'plano': cliente.plano || '',
    'valor_plano': cliente.valor_plano ? `R$ ${parseFloat(cliente.valor_plano.toString()).toFixed(2).replace('.', ',')}` : 'R$ 0,00',
    'data_ativacao': format(dataAtivacao, 'dd/MM/yyyy', { locale: ptBR }),
    'data_vencimento': format(dataVencimento, 'dd/MM/yyyy', { locale: ptBR }),
    'dias_vencimento': diasVencimento.toString(),
    'dias_desde_ativacao': diasDesdeAtivacao.toString(),
    
    // Variáveis do servidor
    'servidor': cliente.servidor || '',
    
    // Variáveis do sistema
    'data_atual': format(now, 'dd/MM/yyyy', { locale: ptBR }),
    'hora_atual': format(now, 'HH:mm', { locale: ptBR }),
    'nome_sistema': nomeSystema,
    
    // Variáveis especiais
    'dias_vencimento_texto': getDiasVencimentoTexto(diasVencimento),
    'status_vencimento': getStatusVencimento(diasVencimento),
    'saudacao': getSaudacao(),
    'mes_atual': format(now, 'MMMM', { locale: ptBR }),
    'ano_atual': format(now, 'yyyy', { locale: ptBR })
  }
}

/**
 * Substitui variáveis no texto
 */
function replaceVariables(text: string, variables: Record<string, string>): string {
  let processedText = text
  
  // Substituir todas as variáveis {variavel}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    processedText = processedText.replace(regex, value || '')
  }
  
  // Remover quaisquer variáveis não substituídas
  processedText = processedText.replace(/\{[^}]+\}/g, '')
  
  return processedText
}

/**
 * Retorna texto amigável para dias de vencimento
 */
function getDiasVencimentoTexto(dias: number): string {
  if (dias < 0) {
    const diasVencidos = Math.abs(dias)
    return diasVencidos === 1 ? '1 dia atrás' : `${diasVencidos} dias atrás`
  } else if (dias === 0) {
    return 'hoje'
  } else if (dias === 1) {
    return 'amanhã'
  } else {
    return `em ${dias} dias`
  }
}

/**
 * Retorna status do vencimento
 */
function getStatusVencimento(dias: number): string {
  if (dias < 0) {
    return 'vencido'
  } else if (dias === 0) {
    return 'vence hoje'
  } else if (dias <= 3) {
    return 'vencimento próximo'
  } else if (dias <= 7) {
    return 'vencimento em breve'
  } else {
    return 'em dia'
  }
}

/**
 * Retorna saudação baseada no horário
 */
function getSaudacao(): string {
  const hora = new Date().getHours()
  
  if (hora >= 6 && hora < 12) {
    return 'Bom dia'
  } else if (hora >= 12 && hora < 18) {
    return 'Boa tarde'
  } else {
    return 'Boa noite'
  }
}

/**
 * Busca nome do sistema das configurações
 */
async function getNomeSistema(): Promise<string> {
  try {
    const result = await executeQuery(
      'SELECT valor FROM configuracoes WHERE chave = ?',
      ['nome_sistema']
    ) as RowDataPacket[]
    
    return result.length > 0 ? result[0].valor : 'Dashboard'
  } catch (error) {
    console.error('Erro ao buscar nome do sistema:', error)
    return 'Dashboard'
  }
}

/**
 * Lista templates ativos por tipo
 */
export async function getTemplatesByTipo(tipo?: string): Promise<MessageTemplate[]> {
  try {
    let query = 'SELECT * FROM message_templates WHERE ativo = TRUE'
    const params: any[] = []
    
    if (tipo) {
      query += ' AND tipo = ?'
      params.push(tipo)
    }
    
    query += ' ORDER BY nome ASC'
    
    const result = await executeQuery(query, params) as RowDataPacket[]
    return result as MessageTemplate[]
  } catch (error) {
    console.error('Erro ao buscar templates:', error)
    throw new Error('Falha ao buscar templates de mensagem')
  }
}

/**
 * Busca template por ID
 */
export async function getTemplateById(id: number): Promise<MessageTemplate | null> {
  try {
    const result = await executeQuery(
      'SELECT * FROM message_templates WHERE id = ?',
      [id]
    ) as RowDataPacket[]
    
    return result.length > 0 ? result[0] as MessageTemplate : null
  } catch (error) {
    console.error('Erro ao buscar template:', error)
    return null
  }
}

/**
 * Busca dados completos do cliente para templates
 */
export async function getClienteDataForTemplate(clienteId: number): Promise<ClienteData | null> {
  try {
    const result = await executeQuery(`
      SELECT 
        c.id,
        COALESCE(c.nome, '') as nome,
        COALESCE(c.whatsapp, '') as whatsapp,
        COALESCE(c.usuario, '') as usuario,
        COALESCE(c.status, '') as status,
        COALESCE(c.data_vencimento, NOW()) as data_vencimento,
        COALESCE(c.data_ativacao, NOW()) as data_ativacao,
        COALESCE(p.nome, '') as plano,
        COALESCE(p.valor, 0) as valor_plano,
        COALESCE(s.nome, '') as servidor
      FROM clientes c
      LEFT JOIN planos p ON c.plano_id = p.id
      LEFT JOIN servidores s ON c.servidor_id = s.id
      WHERE c.id = ?
    `, [clienteId]) as RowDataPacket[]
    
    return result.length > 0 ? result[0] as ClienteData : null
  } catch (error) {
    console.error('Erro ao buscar dados do cliente:', error)
    return null
  }
}

/**
 * Lista clientes com vencimento próximo
 */
export async function getClientesVencimentoProximo(diasAntecedencia: number = 3): Promise<ClienteData[]> {
  try {
    const result = await executeQuery(`
      SELECT 
        c.id,
        c.nome,
        c.whatsapp,
        c.usuario,
        c.status,
        c.data_vencimento,
        c.data_ativacao,
        p.nome as plano,
        p.valor as valor_plano,
        s.nome as servidor
      FROM clientes c
      LEFT JOIN planos p ON c.plano_id = p.id
      LEFT JOIN servidores s ON c.servidor_id = s.id
      WHERE c.status = 'ativo'
        AND c.whatsapp IS NOT NULL 
        AND c.whatsapp != ''
        AND DATE(c.data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY c.data_vencimento ASC
    `, [diasAntecedencia]) as RowDataPacket[]
    
    return result as ClienteData[]
  } catch (error) {
    console.error('Erro ao buscar clientes com vencimento próximo:', error)
    return []
  }
}

/**
 * Preview de template com dados simulados
 */
export async function previewTemplate(template: MessageTemplate): Promise<{ texto: string; imagemCaption?: string }> {
  const dadosSimulados: ClienteData = {
    id: 1,
    nome: 'João Silva',
    whatsapp: '11999999999',
    usuario: 'joao123',
    status: 'ativo',
    data_vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
    data_ativacao: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias atrás
    plano: 'Plano Premium',
    valor_plano: 29.90,
    servidor: 'Servidor Principal'
  }
  
  const variables = {
    'nome': dadosSimulados.nome,
    'whatsapp': dadosSimulados.whatsapp,
    'usuario': dadosSimulados.usuario,
    'status': dadosSimulados.status,
    'plano': dadosSimulados.plano,
    'valor_plano': `R$ ${dadosSimulados.valor_plano.toFixed(2).replace('.', ',')}`,
    'data_ativacao': format(new Date(dadosSimulados.data_ativacao), 'dd/MM/yyyy', { locale: ptBR }),
    'data_vencimento': format(new Date(dadosSimulados.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }),
    'dias_vencimento': '7',
    'dias_desde_ativacao': '30',
    'servidor': dadosSimulados.servidor,
    'data_atual': format(new Date(), 'dd/MM/yyyy', { locale: ptBR }),
    'hora_atual': format(new Date(), 'HH:mm', { locale: ptBR }),
    'nome_sistema': 'Dashboard',
    'dias_vencimento_texto': 'em 7 dias',
    'status_vencimento': 'vencimento em breve',
    'saudacao': getSaudacao(),
    'mes_atual': format(new Date(), 'MMMM', { locale: ptBR }),
    'ano_atual': format(new Date(), 'yyyy', { locale: ptBR })
  }
  
  const texto = replaceVariables(template.mensagem, variables)
  let imagemCaption: string | undefined
  
  if (template.message_type === 'imagem' && template.imagem_caption) {
    imagemCaption = replaceVariables(template.imagem_caption, variables)
  }
  
  return { texto, imagemCaption }
} 