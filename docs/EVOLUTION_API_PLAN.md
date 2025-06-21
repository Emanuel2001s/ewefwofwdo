# 📋 PLANO DE IMPLEMENTAÇÃO - EVOLUTION API

## 🎯 **VISÃO GERAL DO PROJETO**

Integração completa da [Evolution API v2](https://doc.evolution-api.com/v2/pt/get-started/introduction) com o Dashboard IPTV, utilizando a instância em `https://evo.qpainel.com.br/`.

### **Objetivos Principais:**
- ✅ Configuração da Evolution API pelo Admin Supremo
- ✅ Gerenciamento de instâncias WhatsApp
- ✅ Templates de mensagens (texto e imagem)
- ✅ Envio automático de notificações de vencimento
- ✅ Envio manual para clientes específicos
- ✅ Isolamento completo do dashboard do cliente

### **Público-Alvo:**
- **Admin Supremo (ID = 1)**: Acesso total às funcionalidades
- **Clientes**: Sem acesso ou visualização (isolamento completo)

---

## 🗂️ **ESTRUTURA DE IMPLEMENTAÇÃO**

### **FASE 1: CONFIGURAÇÃO BASE E INFRAESTRUTURA**

#### 1.1 Extensão do Sistema de Configurações
**Arquivo**: `lib/configuracoes.ts`

**Configurações a Adicionar:**
```sql
INSERT INTO configuracoes (chave, valor, descricao) VALUES
('evolution_api_url', '', 'URL da Evolution API (ex: https://evo.qpainel.com.br)'),
('evolution_api_key', '', 'API Key global da Evolution API');
```

#### 1.2 Criação de Tabelas no Banco de Dados

**Tabela: `evolution_instancias`**
```sql
CREATE TABLE evolution_instancias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL COMMENT 'Nome amigável da instância',
  instance_name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nome técnico na Evolution',
  status ENUM('criando', 'desconectada', 'conectada', 'erro') DEFAULT 'criando',
  qr_code TEXT COMMENT 'QR Code em base64',
  api_key VARCHAR(255) COMMENT 'API Key específica da instância',
  webhook_url VARCHAR(255) COMMENT 'URL do webhook configurado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Tabela: `message_templates`**
```sql
CREATE TABLE message_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL COMMENT 'Nome do template',
  tipo ENUM('vencimento', 'pagamento', 'boas_vindas', 'manutencao', 'personalizada') NOT NULL,
  message_type ENUM('texto', 'imagem') NOT NULL DEFAULT 'texto',
  assunto VARCHAR(200) COMMENT 'Assunto/título do template',
  mensagem TEXT NOT NULL COMMENT 'Texto da mensagem com variáveis',
  imagem_url VARCHAR(500) COMMENT 'URL da imagem (quando message_type = imagem)',
  imagem_caption TEXT COMMENT 'Legenda da imagem com variáveis',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Tabela: `message_history`**
```sql
CREATE TABLE message_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  instancia_id INT NOT NULL,
  template_id INT,
  numero_whatsapp VARCHAR(20) NOT NULL,
  message_type ENUM('texto', 'imagem') NOT NULL,
  mensagem_enviada TEXT NOT NULL,
  imagem_enviada VARCHAR(500) COMMENT 'URL da imagem enviada',
  status ENUM('enviando', 'enviada', 'erro', 'lida') DEFAULT 'enviando',
  response_data JSON COMMENT 'Resposta da Evolution API',
  error_message TEXT COMMENT 'Mensagem de erro se houver',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (instancia_id) REFERENCES evolution_instancias(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL
);
```

#### 1.3 Middleware de Segurança
**Arquivo**: `lib/admin-middleware.ts`

Verificação obrigatória para todas as rotas Evolution:
- Usuário logado
- Tipo = 'admin'
- ID = 1 (admin supremo)

---

### **FASE 2: BACKEND - COMUNICAÇÃO COM EVOLUTION API**

#### 2.1 Serviço de Comunicação
**Arquivo**: `lib/evolution-api.ts`

**Métodos a Implementar:**
```typescript
class EvolutionAPIService {
  // Configuração
  async testConnection(): Promise<boolean>
  
  // Instâncias
  async createInstance(instanceName: string): Promise<any>
  async getInstanceStatus(instanceName: string): Promise<any>
  async getQRCode(instanceName: string): Promise<string>
  async deleteInstance(instanceName: string): Promise<boolean>
  
  // Mensagens
  async sendTextMessage(instanceName: string, number: string, text: string): Promise<any>
  async sendImageMessage(instanceName: string, number: string, imageUrl: string, caption?: string): Promise<any>
  
  // Webhook
  async setWebhook(instanceName: string, webhookUrl: string): Promise<boolean>
}
```

#### 2.2 APIs do Sistema

**`/api/evolution/config/route.ts`**
- GET: Buscar configurações da Evolution API
- PUT: Atualizar configurações
- POST: Testar conexão

**`/api/evolution/instances/route.ts`**
- GET: Listar instâncias
- POST: Criar nova instância

**`/api/evolution/instances/[id]/route.ts`**
- GET: Detalhes da instância
- DELETE: Excluir instância

**`/api/evolution/instances/[id]/qr/route.ts`**
- GET: Obter QR Code da instância

**`/api/evolution/instances/[id]/status/route.ts`**
- GET: Status atual da instância

**`/api/evolution/templates/route.ts`**
- GET: Listar templates
- POST: Criar template

**`/api/evolution/templates/[id]/route.ts`**
- GET: Detalhes do template
- PUT: Atualizar template
- DELETE: Excluir template

**`/api/evolution/templates/upload/route.ts`**
- POST: Upload de imagens para templates

**`/api/evolution/messages/send/route.ts`**
- POST: Enviar mensagem (texto ou imagem)

**`/api/evolution/messages/history/route.ts`**
- GET: Histórico de mensagens (com filtros)

**`/api/evolution/webhook/route.ts`**
- POST: Receber webhooks da Evolution API

---

### **FASE 3: FRONTEND - INTERFACES ADMINISTRATIVAS**

#### 3.1 Configurações da Evolution API
**Arquivo**: `app/admin/configuracoes/page.tsx` (extensão)

**Nova Aba: "WhatsApp Evolution"**
- Campo: URL da Evolution API
- Campo: API Key Global
- Botão: Testar Conexão
- Status: Conectado/Desconectado

#### 3.2 Layout para Área Evolution
**Arquivo**: `app/admin/evolution/layout.tsx`

**Características:**
- Verificação de admin supremo
- Menu lateral específico para Evolution
- Breadcrumb navegação

#### 3.3 Gerenciador de Instâncias
**Arquivo**: `app/admin/evolution/instancias/page.tsx`

**Funcionalidades:**
- Lista de instâncias com status
- Botão "Nova Instância"
- Modal QR Code
- Ações: Conectar, Desconectar, Excluir
- Atualização em tempo real

**Arquivo**: `app/admin/evolution/instancias/nova/page.tsx`
- Formulário para criar instância
- Validação de nome único
- Redirecionamento automático após criação

#### 3.4 Templates de Mensagens
**Arquivo**: `app/admin/evolution/templates/page.tsx`

**Lista de Templates:**
- Filtros por tipo e status
- Visualização tipo de mensagem (texto/imagem)
- Botões de ação (editar, excluir, ativar/desativar)

**Arquivo**: `app/admin/evolution/templates/novo/page.tsx`
**Arquivo**: `app/admin/evolution/templates/[id]/editar/page.tsx`

**Formulário de Template:**
- Nome do template
- Tipo (vencimento, pagamento, etc.)
- Tipo de mensagem (texto/imagem)
- Editor de mensagem com variáveis
- Upload de imagem (se tipo imagem)
- Legenda da imagem
- Preview em tempo real

#### 3.5 Histórico de Mensagens
**Arquivo**: `app/admin/evolution/mensagens/page.tsx`

**Funcionalidades:**
- Filtros: cliente, período, status, tipo
- Visualização de imagens enviadas
- Detalhes da mensagem
- Status de entrega
- Reenvio de mensagens

#### 3.6 Dashboard WhatsApp
**Arquivo**: `app/admin/evolution/dashboard/page.tsx`

**Estatísticas:**
- Total de mensagens enviadas
- Taxa de entrega
- Instâncias ativas/inativas
- Próximos vencimentos a notificar
- Gráficos de performance

---

### **FASE 4: INTEGRAÇÃO COM SISTEMA DE CLIENTES**

#### 4.1 Extensão da Lista de Clientes
**Arquivo**: `app/admin/clientes/page.tsx` (modificação)

**Novas Funcionalidades:**
- Coluna com botão "WhatsApp"
- Modal para envio de mensagem
- Seleção de template
- Preview antes do envio

#### 4.2 Sistema Automático de Vencimento
**Arquivo**: `lib/auto-whatsapp-notifications.ts`

**Características:**
- Cron job diário
- Verificação de vencimentos próximos
- Envio baseado em templates ativos
- Log de mensagens enviadas
- Configuração de dias de antecedência

**Arquivo**: `app/api/cron/whatsapp-notifications/route.ts`
- Endpoint para execução manual/automatizada

---

### **FASE 5: COMPONENTES REUTILIZÁVEIS**

#### 5.1 Componentes Core
**Arquivo**: `components/evolution-config.tsx`
- Formulário de configuração da Evolution API
- Teste de conexão
- Indicadores de status

**Arquivo**: `components/instance-manager.tsx`
- Lista de instâncias
- Cards com status
- Ações rápidas

**Arquivo**: `components/qr-code-modal.tsx`
- Modal para exibir QR Code
- Atualização automática
- Instruções de conexão

**Arquivo**: `components/template-form.tsx`
- Formulário completo para templates
- Editor de texto com variáveis
- Upload de imagem
- Preview em tempo real

**Arquivo**: `components/message-sender.tsx`
- Modal para envio de mensagem
- Seleção de template
- Personalização de mensagem
- Preview final

**Arquivo**: `components/whatsapp-stats.tsx`
- Cards de estatísticas
- Gráficos de performance
- Indicadores visuais

#### 5.2 Componentes de Segurança
**Arquivo**: `components/admin-guard.tsx`
- HOC para proteção de rotas
- Verificação de admin supremo
- Redirecionamento automático

---

## 📱 **VARIÁVEIS DISPONÍVEIS NOS TEMPLATES**

### **Variáveis do Cliente:**
- `{nome}` - Nome do cliente
- `{whatsapp}` - WhatsApp do cliente
- `{usuario}` - Usuário de acesso
- `{status}` - Status do cliente

### **Variáveis do Plano:**
- `{plano}` - Nome do plano
- `{valor_plano}` - Valor do plano
- `{data_ativacao}` - Data de ativação
- `{data_vencimento}` - Data de vencimento
- `{dias_vencimento}` - Dias até vencimento
- `{dias_desde_ativacao}` - Dias desde ativação

### **Variáveis do Servidor:**
- `{servidor}` - Nome do servidor

### **Variáveis do Sistema:**
- `{data_atual}` - Data atual
- `{hora_atual}` - Hora atual
- `{nome_sistema}` - Nome do sistema

---

## 🔒 **CONTROLE DE ACESSO E SEGURANÇA**

### **Admin Supremo (ID = 1) - ACESSO TOTAL:**
- ✅ Configuração da Evolution API
- ✅ Criação e gestão de instâncias
- ✅ Templates de mensagem (texto e imagem)
- ✅ Envio manual para clientes
- ✅ Histórico completo de mensagens
- ✅ Dashboard de estatísticas
- ✅ Configurações de automação

### **Clientes - ISOLAMENTO COMPLETO:**
- ❌ Nenhuma funcionalidade de WhatsApp
- ❌ Nenhuma visualização de mensagens
- ❌ Dashboard cliente inalterado
- ❌ Nenhuma notificação sobre WhatsApp

### **Verificações de Segurança:**
1. **Middleware em todas as rotas `/api/evolution/*`**
2. **Guard em todas as páginas `/admin/evolution/*`**
3. **Verificação de sessão ativa**
4. **Validação de tipo de usuário**
5. **Proteção contra acesso direto**

---

## 🚀 **FLUXO DE IMPLEMENTAÇÃO**

### **Ordem de Desenvolvimento:**
1. **FASE 1**: Infraestrutura e banco de dados
2. **FASE 2**: APIs e comunicação com Evolution
3. **FASE 3**: Interfaces administrativas
4. **FASE 4**: Integração com clientes
5. **FASE 5**: Componentes e otimizações

### **Critérios de Aceitação por Fase:**

**FASE 1 - COMPLETA QUANDO:**
- ✅ Tabelas criadas no banco
- ✅ Configurações adicionadas
- ✅ Middleware de segurança funcionando

**FASE 2 - COMPLETA QUANDO:**
- ✅ Comunicação com Evolution API funcionando
- ✅ Todas as APIs respondendo corretamente
- ✅ Webhook configurado e recebendo dados

**FASE 3 - COMPLETA QUANDO:**
- ✅ Interface de configuração funcionando
- ✅ Gerenciador de instâncias operacional
- ✅ CRUD de templates completo
- ✅ Histórico de mensagens visível

**FASE 4 - COMPLETA QUANDO:**
- ✅ Botão WhatsApp na lista de clientes
- ✅ Envio manual funcionando
- ✅ Sistema automático operacional

**FASE 5 - COMPLETA QUANDO:**
- ✅ Todos os componentes reutilizáveis
- ✅ Interface polida e responsiva
- ✅ Performance otimizada

---

## 📊 **ESTRUTURA DE ARQUIVOS FINAL**

```
projeto/
├── docs/
│   └── EVOLUTION_API_PLAN.md          # Este documento
├── lib/
│   ├── evolution-api.ts               # Comunicação com Evolution API
│   ├── auto-whatsapp-notifications.ts # Sistema automático
│   ├── whatsapp-templates.ts          # Processamento de templates
│   └── admin-middleware.ts            # Verificação admin supremo
├── app/api/evolution/
│   ├── config/route.ts                # Configurações
│   ├── instances/
│   │   ├── route.ts                   # CRUD instâncias
│   │   └── [id]/
│   │       ├── route.ts               # Instância específica
│   │       ├── qr/route.ts           # QR Code
│   │       └── status/route.ts       # Status
│   ├── templates/
│   │   ├── route.ts                   # CRUD templates
│   │   ├── [id]/route.ts             # Template específico
│   │   └── upload/route.ts           # Upload imagens
│   ├── messages/
│   │   ├── send/route.ts             # Envio mensagens
│   │   └── history/route.ts          # Histórico
│   └── webhook/route.ts              # Webhook Evolution
├── app/admin/evolution/              # Área exclusiva admin supremo
│   ├── layout.tsx                    # Layout com verificação
│   ├── instancias/
│   │   ├── page.tsx                  # Lista instâncias
│   │   ├── nova/page.tsx            # Nova instância
│   │   └── [id]/page.tsx            # Detalhes instância
│   ├── templates/
│   │   ├── page.tsx                  # Lista templates
│   │   ├── novo/page.tsx            # Novo template
│   │   └── [id]/editar/page.tsx     # Editar template
│   ├── mensagens/page.tsx           # Histórico mensagens
│   └── dashboard/page.tsx           # Dashboard WhatsApp
├── components/
│   ├── evolution-config.tsx          # Config Evolution API
│   ├── instance-manager.tsx          # Gerenciador instâncias
│   ├── template-form.tsx            # Formulário templates
│   ├── message-sender.tsx           # Envio mensagens
│   ├── qr-code-modal.tsx            # Modal QR Code
│   ├── whatsapp-stats.tsx           # Estatísticas
│   └── admin-guard.tsx              # Guard admin supremo
└── public/uploads/whatsapp/         # Diretório para imagens
    └── templates/                    # Imagens dos templates
```

---

## 🎯 **CONSIDERAÇÕES FINAIS**

### **Benefícios da Implementação:**
- 📱 Comunicação direta com clientes via WhatsApp
- 🤖 Automação de notificações de vencimento
- 📊 Controle total sobre mensagens enviadas
- 🔒 Segurança com isolamento completo do cliente
- 📈 Melhoria na retenção de clientes

### **Tecnologias Utilizadas:**
- **Evolution API v2** - Comunicação WhatsApp
- **Next.js** - Framework React
- **MySQL** - Banco de dados
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização

### **Tempo Estimado de Implementação:**
- **FASE 1**: 1-2 dias
- **FASE 2**: 2-3 dias
- **FASE 3**: 3-4 dias
- **FASE 4**: 1-2 dias
- **FASE 5**: 1-2 dias
- **TOTAL**: 8-13 dias

---

**Documento criado em**: Janeiro 2025  
**Versão**: 1.0  
**Status**: Aprovado para implementação 