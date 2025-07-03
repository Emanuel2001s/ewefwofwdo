# Plano de Ação: Sistema de Envio em Massa WhatsApp

## 📋 Visão Geral

Implementação de um sistema completo de envio em massa de mensagens WhatsApp para o Dashboard IPTV, permitindo comunicação eficiente com todos os clientes através de templates personalizados e filtros avançados.

## 🎯 Objetivos

- **Comunicação Massiva**: Enviar avisos importantes (manutenção, atualizações, promoções) para todos os clientes
- **Segmentação Inteligente**: Filtrar clientes por status (ativos, inativos, vencidos)
- **Templates Reutilizáveis**: Utilizar sistema de templates existente
- **Controle de Fluxo**: Implementar intervalos entre envios para evitar bloqueios
- **Monitoramento**: Histórico completo de envios com status de entrega

## 🗂️ Estrutura de Arquivos

### Frontend (React/Next.js)
```
app/admin/envio-massa/
├── page.tsx                    # Página principal do envio em massa
├── components/
│   ├── filtros-clientes.tsx    # Componente de filtros de clientes
│   ├── selecao-template.tsx    # Seletor de templates
│   ├── configuracao-envio.tsx  # Configurações de intervalo e opções
│   ├── preview-mensagem.tsx    # Preview da mensagem
│   └── historico-envios.tsx    # Lista de histórico de envios
├── historico/
│   └── page.tsx                # Página de histórico detalhado
└── nova-campanha/
    └── page.tsx                # Criação de nova campanha
```

### Backend (API Routes)
```
app/api/envio-massa/
├── route.ts                    # CRUD de campanhas
├── iniciar/
│   └── route.ts               # Iniciar envio da campanha
├── status/
│   └── route.ts               # Status da campanha em andamento
├── clientes/
│   ├── filtros/
│   │   └── route.ts           # Filtros de clientes (ativos, vencidos, etc)
│   └── count/
│       └── route.ts           # Contagem de clientes por filtro
├── instancias/
│   └── route.ts               # Listar instâncias WhatsApp disponíveis
├── templates/
│   └── route.ts               # Templates disponíveis
└── historico/
    └── route.ts               # Histórico de envios
```

### Database Schema
```sql
-- Tabela para campanhas de envio em massa
CREATE TABLE campanhas_envio_massa (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    template_id INT,
    instancia_id INT,
    filtro_clientes JSON,
    intervalo_segundos INT DEFAULT 10,
    status ENUM('rascunho', 'agendada', 'enviando', 'concluida', 'cancelada', 'erro') DEFAULT 'rascunho',
    total_clientes INT DEFAULT 0,
    enviados INT DEFAULT 0,
    sucessos INT DEFAULT 0,
    falhas INT DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_inicio TIMESTAMP NULL,
    data_conclusao TIMESTAMP NULL,
    created_by INT,
    FOREIGN KEY (template_id) REFERENCES message_templates(id),
    FOREIGN KEY (instancia_id) REFERENCES evolution_instancias(id),
    FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

-- Tabela para detalhes de cada envio individual
CREATE TABLE envios_massa_detalhes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campanha_id INT,
    cliente_id INT,
    status ENUM('pendente', 'enviado', 'entregue', 'lido', 'erro') DEFAULT 'pendente',
    mensagem_enviada TEXT,
    erro_detalhes TEXT NULL,
    data_envio TIMESTAMP NULL,
    data_entrega TIMESTAMP NULL,
    data_leitura TIMESTAMP NULL,
    tentativas INT DEFAULT 0,
    FOREIGN KEY (campanha_id) REFERENCES campanhas_envio_massa(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);
```

## 🔧 Funcionalidades Detalhadas

### 1. Interface Principal de Envio

**Localização**: `app/admin/envio-massa/page.tsx`

**Funcionalidades**:
- Dashboard com estatísticas de campanhas
- Botão "Nova Campanha" destacado
- Lista de campanhas recentes com status
- Gráficos de performance dos envios

### 2. Criação de Nova Campanha

**Localização**: `app/admin/envio-massa/nova-campanha/page.tsx`

**Etapas do Wizard**:

#### Etapa 1: Informações Básicas
- Nome da campanha
- Descrição (opcional)
- Data/hora de envio (imediato ou agendado)

#### Etapa 2: Seleção de Template
- Lista de templates disponíveis
- Preview do template selecionado
- Opção de personalizar variáveis (nome do cliente, vencimento, etc.)

#### Etapa 3: Filtros de Clientes
- **Todos os clientes**
- **Clientes ativos** (status = 'ativo')
- **Clientes inativos** (status = 'inativo')
- **Clientes vencidos** (vencimento < hoje)
- **Clientes próximos ao vencimento** (vencimento entre hoje e 7 dias)
- **Filtros personalizados**: por plano, servidor, cidade, etc.

#### Etapa 4: Configurações de Envio
- **Seleção de Instância**: dropdown com instâncias WhatsApp disponíveis
  - Listar apenas instâncias ativas e conectadas
  - Mostrar status de cada instância (conectada, desconectada, erro)
  - Validar se a instância selecionada está funcionando
- **Intervalo entre envios**: slider de 5 a 60 segundos
- **Horário de funcionamento**: enviar apenas em horário comercial
- **Limite diário**: máximo de envios por dia

#### Etapa 5: Revisão e Confirmação
- Resumo da campanha
- Contagem total de clientes
- Preview da mensagem final
- Estimativa de tempo total

### 3. Execução da Campanha

**Processo de Envio**:
1. **Validação**: Verificar instância WhatsApp ativa
2. **Preparação**: Criar registros na tabela de detalhes
3. **Envio Gradual**: 
   - Processar clientes em lotes
   - Respeitar intervalo configurado
   - Atualizar status em tempo real
4. **Monitoramento**: 
   - Webhook para status de entrega
   - Retry automático para falhas
   - Logs detalhados

### 4. Monitoramento em Tempo Real

**Dashboard de Acompanhamento**:
- Barra de progresso
- Estatísticas em tempo real
- Lista de envios em andamento
- Alertas para falhas
- Opção de pausar/cancelar campanha

### 5. Histórico e Relatórios

**Funcionalidades**:
- Lista de todas as campanhas
- Filtros por data, status, template
- Exportação para Excel/PDF
- Métricas detalhadas:
  - Taxa de entrega
  - Taxa de leitura
  - Tempo médio de resposta
  - Clientes que responderam

## 🚀 Implementação Fase a Fase

### Fase 1: Estrutura Base e Database (Sprint 1)
**Duração**: 3-5 dias
- [ ] **Database Schema**:
  - [ ] Criar tabelas campanhas_envio_massa e envios_massa_detalhes
  - [ ] Adicionar índices para performance
  - [ ] Testar relacionamentos com tabelas existentes
- [ ] **Estrutura de Arquivos**:
  - [ ] Criar pasta app/admin/envio-massa/
  - [ ] Implementar layout base seguindo padrão atual
  - [ ] Configurar roteamento no admin layout
- [ ] **API Base**:
  - [ ] Implementar route.ts principal com MCP MySQL DB
  - [ ] Criar API de listagem de instâncias WhatsApp
  - [ ] Testar conexões e consultas básicas

### Fase 2: Interface de Criação Responsiva (Sprint 2)
**Duração**: 5-7 dias
- [ ] **Página Principal**:
  - [ ] Dashboard com cards de estatísticas (mobile-first)
  - [ ] Lista de campanhas recentes responsiva
  - [ ] Botão "Nova Campanha" prominente
- [ ] **Wizard de Criação**:
  - [ ] Estrutura multi-etapas adaptável (mobile/desktop)
  - [ ] Navegação entre etapas com indicadores visuais
  - [ ] Validação de dados em cada etapa
- [ ] **Componentes Específicos**:
  - [ ] Seletor de instâncias WhatsApp com status
  - [ ] Filtros de clientes com contadores dinâmicos
  - [ ] Seleção de templates com preview
  - [ ] Configurações de envio (intervalos, horários)

### Fase 3: Motor de Envio e Controle (Sprint 3)
**Duração**: 7-10 dias
- [ ] **Sistema de Processamento**:
  - [ ] Implementar fila de envios com Redis
  - [ ] Controle de intervalos configuráveis
  - [ ] Sistema de retry para falhas
- [ ] **Integração Evolution API**:
  - [ ] Envio de mensagens via instância selecionada
  - [ ] Tratamento de erros e timeouts
  - [ ] Webhook para status de entrega
- [ ] **Monitoramento de Execução**:
  - [ ] Atualização de status em tempo real
  - [ ] Logs detalhados de cada envio
  - [ ] Controles de pausa/cancelamento

### Fase 4: Dashboard de Monitoramento (Sprint 4)
**Duração**: 4-6 dias
- [ ] **Acompanhamento em Tempo Real**:
  - [ ] WebSocket para atualizações ao vivo
  - [ ] Barra de progresso responsiva
  - [ ] Métricas em tempo real (enviados, sucessos, falhas)
- [ ] **Interface de Controle**:
  - [ ] Botões de pausar/retomar campanha
  - [ ] Cancelamento de campanhas em andamento
  - [ ] Alertas visuais para problemas
- [ ] **Mobile Optimization**:
  - [ ] Cards de status empilhados no mobile
  - [ ] Gestos touch para navegação
  - [ ] Notificações push (opcional)

### Fase 5: Histórico e Relatórios (Sprint 5)
**Duração**: 5-7 dias
- [ ] **Página de Histórico**:
  - [ ] Lista completa de campanhas com filtros
  - [ ] Detalhes de cada campanha com drill-down
  - [ ] Tabelas responsivas com paginação
- [ ] **Analytics e Métricas**:
  - [ ] Gráficos de performance (recharts)
  - [ ] KPIs consolidados por período
  - [ ] Comparativo entre campanhas
- [ ] **Exportação de Dados**:
  - [ ] Relatórios em Excel/PDF
  - [ ] Dados de clientes que responderam
  - [ ] Métricas detalhadas por instância

### 📱 Requisitos de Responsividade (Todas as Fases)
- **Mobile (320px - 768px)**:
  - Layout em cards empilhados
  - Formulários em tela cheia
  - Navegação por bottom tabs
  - Botões touch-friendly (min 44px)

- **Tablet (768px - 1024px)**:
  - Grid de 2 colunas
  - Sidebar colapsável
  - Modals adaptados

- **Desktop (1024px+)**:
  - Layout completo com sidebar
  - Grid de 3-4 colunas
  - Tooltips e hover states

### 🔗 Integração MCP MySQL DB (Todas as Fases)
- **Consultas de Leitura**: Usar mcp_MySQL_DB_run_sql_query
- **Inserções**: Usar mcp_MySQL_DB_insert_data  
- **Atualizações**: Usar mcp_MySQL_DB_update_data
- **Transações**: Implementar rollback para operações críticas
- **Performance**: Aproveitar connection pooling existente

## 🔧 Tecnologias e Dependências

### Novas Dependências
```json
{
  "node-cron": "^3.0.2",        // Agendamento de tarefas
  "bull": "^4.10.4",            // Sistema de filas
  "redis": "^4.6.5",            // Cache e filas
  "socket.io": "^4.7.2",        // Atualizações em tempo real
  "recharts": "^2.8.0"          // Gráficos e métricas
}
```

### Integrações
- **Evolution API**: Para envio das mensagens
- **MCP MySQL DB**: Para todas as consultas ao banco de dados
  - Utilizar funções mcp_MySQL_DB_run_sql_query para consultas SELECT
  - Utilizar mcp_MySQL_DB_insert_data para inserções
  - Utilizar mcp_MySQL_DB_update_data para atualizações
  - Aproveitar connection pooling otimizado existente
- **Redis**: Para filas e cache
- **WebSockets**: Para atualizações em tempo real
- **Cron Jobs**: Para campanhas agendadas

## 📊 Considerações de Performance

### Otimizações
- **Processamento em lotes**: Enviar mensagens em grupos de 50-100
- **Cache de templates**: Armazenar templates processados
- **Índices de database**: Otimizar consultas de clientes
- **Conexão persistente**: Manter conexão com Evolution API

### Limites e Restrições
- **Limite diário**: Máximo 1000 mensagens por instância
- **Intervalo mínimo**: 5 segundos entre envios
- **Retry automático**: Máximo 3 tentativas por mensagem
- **Timeout**: 30 segundos por envio

## 🛡️ Segurança e Compliance

### Controles de Acesso
- Apenas usuários admin podem criar campanhas
- Log de todas as ações realizadas
- Aprovação para campanhas com mais de 500 destinatários

### Compliance WhatsApp
- Respeitar políticas do WhatsApp Business
- Não enviar spam ou conteúdo inadequado
- Implementar opt-out automático
- Manter registro de consentimento

## 🎨 UX/UI Guidelines

### Design Patterns
- **Consistência com Layout Atual**: Seguir exatamente os padrões visuais existentes
  - Utilizar componentes UI já existentes (buttons, cards, tables)
  - Manter cores, tipografia e espaçamentos consistentes
  - Reutilizar layouts de páginas similares (clientes, planos, servidores)
- Wizard multi-etapas com navegação clara
- Cards informativos com métricas destacadas
- Cores para status (verde: sucesso, vermelho: erro, amarelo: pendente)
- Loading states e skeleton loaders
- Confirmações para ações críticas

### Responsividade Mobile-First
- **Layout Completamente Responsivo**: 
  - Mobile: Layout em cards empilhados
  - Tablet: Grid de 2 colunas
  - Desktop: Grid completo de 3-4 colunas
- **Componentes Adaptativos**:
  - Wizard em tela cheia no mobile
  - Dropdowns e selects touch-friendly
  - Botões com tamanho adequado para toque
  - Tabelas com scroll horizontal automático
- **Navegação Mobile**:
  - Bottom navigation para etapas do wizard
  - Swipe gestures entre etapas
  - Modals que ocupam tela inteira em dispositivos pequenos

## 📈 Métricas de Sucesso

### KPIs Principais
- **Taxa de Entrega**: % de mensagens entregues com sucesso
- **Tempo Médio de Envio**: Tempo para completar uma campanha
- **Taxa de Erro**: % de falhas no envio
- **Engagement**: % de clientes que responderam

### Monitoring
- Alertas para campanhas com alta taxa de erro
- Notificações para administradores
- Dashboard com métricas em tempo real
- Relatórios semanais automáticos

---

## 📝 Próximos Passos

1. **Revisar o plano** com a equipe de desenvolvimento
2. **Definir prioridades** das funcionalidades
3. **Configurar ambiente** Redis e dependências
4. **Iniciar implementação** pela Fase 1
5. **Testes incrementais** a cada funcionalidade

---

*Documento criado em: {{ data_atual }}*
*Versão: 1.0*
*Autor: Sistema Dashboard IPTV* 