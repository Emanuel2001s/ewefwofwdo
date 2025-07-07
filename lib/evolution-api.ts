import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { getConfiguracao } from './configuracoes'
import { formatPhoneNumberForEvolution } from './phone-utils'

type MessageStatus = 'pendente' | 'enviado' | 'lido' | 'falha'

// Tipos para a Evolution API
export interface EvolutionInstance {
  instanceName: string
  status: 'creating' | 'open' | 'close' | 'connecting'
  qrcode?: {
    code: string
    base64: string
  }
  qrCode?: {
    base64: string
  }
  webhook?: string
  apikey?: string
}

export interface SendMessageResponse {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: any
  messageTimestamp: number
  status: 'PENDING' | 'SENT' | 'RECEIVED' | 'READ'
}

export interface WebhookData {
  event: string
  instance: string
  data: any
}

class EvolutionAPIService {
  private apiClient: AxiosInstance | null = null
  private baseURL: string = ''
  private globalApiKey: string = ''

  /**
   * Inicializa o cliente da API com as configurações do banco
   */
  private async initializeClient(): Promise<AxiosInstance> {
    if (this.apiClient && this.baseURL && this.globalApiKey) {
      return this.apiClient
    }

    // Buscar configurações do banco
    this.baseURL = await getConfiguracao('evolution_api_url') || ''
    this.globalApiKey = await getConfiguracao('evolution_api_key') || ''

    if (!this.baseURL || !this.globalApiKey) {
      throw new Error('Evolution API não configurada. Configure a URL e API Key nas configurações.')
    }

    // Validar e normalizar URL
    try {
      const url = new URL(this.baseURL)
      // Remover barra final se existir
      this.baseURL = url.toString().replace(/\/$/, '')
    } catch (error) {
      throw new Error(`URL da Evolution API inválida: ${this.baseURL}`)
    }

    // Criar cliente axios
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.globalApiKey
      },
      timeout: 30000, // 30 segundos
      validateStatus: (status) => status < 500 // Aceitar códigos de status menores que 500
    })

    // Interceptor para logs detalhados
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log('Evolution API Request:', {
          method: config.method?.toUpperCase(),
          url: `${config.baseURL}${config.url}`,
          headers: {
            'Content-Type': config.headers['Content-Type'],
            'apikey': config.headers['apikey'] ? '[HIDDEN]' : 'NOT_SET'
          }
        })
        return config
      },
      (error) => {
        console.error('Evolution API Request Error:', error)
        return Promise.reject(error)
      }
    )

    this.apiClient.interceptors.response.use(
      (response) => {
        console.log('Evolution API Response:', {
          status: response.status,
          url: response.config.url,
          dataType: typeof response.data,
          dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
        })
        return response
      },
      (error) => {
        console.error('Evolution API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code
        })
        throw error
      }
    )

    return this.apiClient
  }

  /**
   * Testa a conexão com a Evolution API
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.initializeClient()
      
      // Usar endpoint correto da documentação oficial da Evolution API v2
      const response = await client.get('/instance/fetchInstances')
      
      // Verificar se a resposta é válida (status 200 e dados válidos)
      if (response.status === 200) {
        // A API retorna um array de instâncias ou um objeto vazio se não houver instâncias
        const data = response.data
        return Array.isArray(data) || (typeof data === 'object' && data !== null)
      }
      
      return false
    } catch (error: any) {
      console.error('Erro ao testar conexão Evolution API:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      })
      return false
    }
  }

  /**
   * Lista todas as instâncias
   */
  async fetchInstances(): Promise<EvolutionInstance[]> {
    try {
      const client = await this.initializeClient()
      const response = await client.get('/instance/fetchInstances')
      return response.data || []
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error)
      throw new Error('Falha ao buscar instâncias do WhatsApp')
    }
  }

  /**
   * Cria uma nova instância
   */
  async createInstance(instanceName: string, webhook?: string): Promise<EvolutionInstance> {
    try {
      const client = await this.initializeClient()
      
      const data: any = {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      }

      // Adicionar webhook se fornecido
      if (webhook) {
        data.webhook = webhook
        data.webhook_by_events = true
        data.events = [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED', 
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE'
        ]
      }

      const response = await client.post('/instance/create', data)
      return response.data
    } catch (error: any) {
      console.error('Erro ao criar instância:', error)
      throw new Error(error.response?.data?.message || 'Falha ao criar instância do WhatsApp')
    }
  }

  /**
   * Busca informações de uma instância específica
   */
  async getInstanceInfo(instanceName: string): Promise<EvolutionInstance> {
    try {
      const client = await this.initializeClient()
      const response = await client.get(`/instance/fetchInstances?instanceName=${instanceName}`)
      
      if (response.data && response.data.length > 0) {
        return response.data[0]
      }
      
      throw new Error('Instância não encontrada')
    } catch (error: any) {
      console.error('Erro ao buscar instância:', error)
      throw new Error(error.response?.data?.message || 'Falha ao buscar informações da instância')
    }
  }

  /**
   * Busca o status de conexão de uma instância (com múltiplas fontes)
   */
  async getInstanceStatus(instanceName: string): Promise<string> {
    try {
      const client = await this.initializeClient()
      
      // Método 1: connectionState (menos confiável)
      let connectionState = 'close'
      try {
        const stateResponse = await client.get(`/instance/connectionState/${instanceName}`)
        connectionState = stateResponse.data?.state || 'close'
        console.log(`Status via connectionState para ${instanceName}: ${connectionState}`)
      } catch (error) {
        console.log(`Erro ao buscar connectionState para ${instanceName}:`, error)
      }
      
      // Método 2: fetchInstances (mais confiável)
      let fetchStatus = 'close'
      try {
        const fetchResponse = await client.get(`/instance/fetchInstances?instanceName=${instanceName}`)
        if (fetchResponse.data && fetchResponse.data.length > 0) {
          fetchStatus = fetchResponse.data[0].connectionStatus || 'close'
          console.log(`Status via fetchInstances para ${instanceName}: ${fetchStatus}`)
        }
      } catch (error) {
        console.log(`Erro ao buscar fetchInstances para ${instanceName}:`, error)
      }
      
      // Lógica de priorização:
      // 1. Se fetchInstances retorna 'open', é confiável
      if (fetchStatus === 'open') {
        console.log(`✅ Instância ${instanceName} confirmada como CONECTADA via fetchInstances`)
        return 'open'
      }
      
      // 2. Se connectionState retorna 'open' e fetchInstances não contradiz, aceitar
      if (connectionState === 'open' && fetchStatus !== 'close') {
        console.log(`✅ Instância ${instanceName} confirmada como CONECTADA via connectionState`)
        return 'open'
      }
      
      // 3. Se ambos retornam close, está realmente desconectada
      if (connectionState === 'close' && fetchStatus === 'close') {
        console.log(`❌ Instância ${instanceName} confirmada como DESCONECTADA`)
        return 'close'
      }
      
      // 4. Casos especiais - priorizar fetchInstances
      console.log(`⚠️ Status inconsistente para ${instanceName}: connectionState=${connectionState}, fetchInstances=${fetchStatus}. Usando fetchInstances.`)
      return fetchStatus
      
    } catch (error) {
      console.error('Erro ao buscar status da instância:', error)
      return 'close'
    }
  }

  /**
   * Conecta uma instância (força geração do QR Code)
   */
  async connectInstance(instanceName: string): Promise<string | null> {
    try {
      const client = await this.initializeClient()
      const response = await client.get(`/instance/connect/${instanceName}`)
      
      console.log(`Connect response para ${instanceName}:`, JSON.stringify(response.data, null, 2))
      
      if (response.data?.base64) {
        return response.data.base64
      }
      
      if (response.data?.qrcode?.base64) {
        return response.data.qrcode.base64
      }
      
      return null
    } catch (error: any) {
      console.error('Erro ao conectar instância:', error?.response?.data || error.message)
      return null
    }
  }

  /**
   * Busca o QR Code de uma instância
   */
  async getQRCode(instanceName: string): Promise<string | null> {
    try {
      console.log(`Buscando QR Code para instância: ${instanceName}`)
      
      // Primeiro, tentar forçar conexão para gerar QR Code
      const connectQr = await this.connectInstance(instanceName)
      if (connectQr) {
        console.log(`QR Code obtido via connect para ${instanceName}`)
        return connectQr
      }
      
      // Fallback para o método original
      const instanceInfo = await this.getInstanceInfo(instanceName)
      console.log(`Instance info para ${instanceName}:`, JSON.stringify(instanceInfo, null, 2))
      
      // Verificar diferentes formatos possíveis do QR Code
      if (instanceInfo.qrcode?.base64) {
        console.log(`QR Code encontrado em instanceInfo.qrcode.base64 para ${instanceName}`)
        return instanceInfo.qrcode.base64
      }
      
      if (instanceInfo.qrcode?.code) {
        console.log(`QR Code encontrado em instanceInfo.qrcode.code para ${instanceName}`)
        return instanceInfo.qrcode.code
      }
      
      if (instanceInfo.qrCode?.base64) {
        console.log(`QR Code encontrado em instanceInfo.qrCode.base64 para ${instanceName}`)
        return instanceInfo.qrCode.base64
      }
      
      // Se a instância foi criada recentemente, pode não ter QR Code ainda
      const status = await this.getInstanceStatus(instanceName)
      console.log(`Status da instância ${instanceName}: ${status}`)
      
      if (status === 'close' || status === 'connecting') {
        console.log(`Instância ${instanceName} está ${status}, QR Code pode não estar disponível ainda`)
        return null
      }
      
      console.log(`Nenhum QR Code encontrado para ${instanceName}`)
      return null
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error)
      return null
    }
  }

  /**
   * Exclui uma instância
   */
  async deleteInstance(instanceName: string): Promise<boolean> {
    try {
      const client = await this.initializeClient()
      await client.delete(`/instance/delete/${instanceName}`)
      return true
    } catch (error: any) {
      console.error('Erro ao excluir instância:', error)
      throw new Error(error.response?.data?.message || 'Falha ao excluir instância')
    }
  }

  /**
   * Reinicia uma instância
   */
  async restartInstance(instanceName: string): Promise<boolean> {
    try {
      const client = await this.initializeClient()
      await client.put(`/instance/restart/${instanceName}`)
      return true
    } catch (error: any) {
      console.error('Erro ao reiniciar instância:', error)
      throw new Error(error.response?.data?.message || 'Falha ao reiniciar instância')
    }
  }

  /**
   * Conecta uma instância (gera QR Code para conexão)
   */
  async connectInstanceForQR(instanceName: string): Promise<boolean> {
    try {
      const client = await this.initializeClient()
      await client.get(`/instance/connect/${instanceName}`)
      return true
    } catch (error: any) {
      console.error('Erro ao conectar instância:', error)
      throw new Error(error.response?.data?.message || 'Falha ao conectar instância')
    }
  }

  /**
   * Desconecta uma instância
   */
  async logoutInstance(instanceName: string): Promise<boolean> {
    try {
      const client = await this.initializeClient()
      await client.delete(`/instance/logout/${instanceName}`)
      return true
    } catch (error: any) {
      console.error('Erro ao desconectar instância:', error)
      throw new Error(error.response?.data?.message || 'Falha ao desconectar instância')
    }
  }

  /**
   * Formata número de telefone para o padrão da Evolution API
   */
  private formatPhoneNumber(number: string): string {
    return formatPhoneNumberForEvolution(number)
  }

  /**
   * Envia uma mensagem de texto
   */
  async sendTextMessage(
    instanceName: string, 
    number: string, 
    text: string
  ): Promise<SendMessageResponse> {
    try {
      const client = await this.initializeClient()
      const formattedNumber = this.formatPhoneNumber(number)
      
      console.log(`Enviando mensagem para ${formattedNumber}`)
      
      const response = await client.post(`/message/sendText/${instanceName}`, {
        number: formattedNumber,
        text: text
      })
      
      return response.data
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      throw new Error(error.response?.data?.message || 'Falha ao enviar mensagem')
    }
  }

  /**
   * Verifica o status de uma mensagem enviada
   */
  async checkMessageStatus(
    instanceName: string,
    messageId: string,
    number: string
  ): Promise<MessageStatus> {
    try {
      const client = await this.initializeClient()
      const formattedNumber = this.formatPhoneNumber(number)
      
      console.log(`Verificando status da mensagem ${messageId} para ${formattedNumber}`)
      
      const response = await client.get(`/message/getStatus/${instanceName}`, {
        params: {
          key: messageId,
          remoteJid: `${formattedNumber}@s.whatsapp.net`
        }
      })
      
      console.log(`Status retornado para ${formattedNumber}:`, response.data)
      
      // Verificar se a resposta é um objeto e tem a propriedade status
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Resposta inválida da API')
      }

      const status = String(response.data.status || '').toLowerCase()
      
      // Mapear status da Evolution API para nossos status
      switch (status) {
        case 'sent':
        case 'delivered':
          return 'enviado'
        case 'read':
          return 'lido'
        case 'failed':
        case 'error':
          return 'falha'
        default:
          return 'pendente'
      }
    } catch (error: any) {
      console.error('Erro ao verificar status da mensagem:', {
        instanceName,
        messageId,
        number,
        error: error.message,
        response: error.response?.data
      })
      throw new Error(error.response?.data?.message || 'Falha ao verificar status da mensagem')
    }
  }

  /**
   * Envia mensagem com imagem
   */
  async sendImageMessage(
    instanceName: string,
    number: string,
    imageUrl: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    try {
      const client = await this.initializeClient()
      
      // Garantir que o número está no formato correto
      const formattedNumber = this.formatPhoneNumber(number)
      
      const response = await client.post(`/message/sendMedia/${instanceName}`, {
        number: formattedNumber,
        media: imageUrl,
        caption: caption || '',
        mediatype: 'image'
      })
      
      return response.data
    } catch (error: any) {
      console.error('Erro ao enviar mensagem com imagem:', error)
      throw new Error(error.response?.data?.message || 'Falha ao enviar imagem')
    }
  }

  /**
   * Configura webhook para uma instância
   */
  async setWebhook(instanceName: string, webhookUrl: string): Promise<boolean> {
    try {
      const client = await this.initializeClient()
      
      await client.put(`/webhook/set/${instanceName}`, {
        url: webhookUrl,
        webhook_by_events: true,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE', 
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE'
        ]
      })
      
      return true
    } catch (error: any) {
      console.error('Erro ao configurar webhook:', error)
      throw new Error(error.response?.data?.message || 'Falha ao configurar webhook')
    }
  }

  /**
   * Processa variáveis em templates de mensagem
   */
  async processMessageTemplate(
    template: string,
    variables: Record<string, any>
  ): Promise<string> {
    let processedMessage = template
    
    // Substituir todas as variáveis {variavel}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      processedMessage = processedMessage.replace(regex, String(value || ''))
    }
    
    return processedMessage
  }
}

// Exportar a classe
export { EvolutionAPIService }

// Singleton instance
const evolutionApiService = new EvolutionAPIService()

export default evolutionApiService 