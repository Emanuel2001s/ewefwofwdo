# Sistema de Envio em Massa - Documentação Técnica

## Visão Geral

O sistema de envio em massa é uma funcionalidade que permite o envio automatizado de mensagens WhatsApp para múltiplos clientes através da Evolution API. O sistema é projetado para ser robusto, escalável e confiável, com recursos de retentativa, controle de taxa de envio e monitoramento detalhado.

## Arquitetura

### Componentes Principais

1. **Campanha de Envio**
   - Gerencia o estado geral da campanha
   - Controla intervalo entre envios
   - Mantém contadores de sucesso/falha
   - Tabela: `campanhas_envio_massa`

2. **Detalhes de Envio**
   - Rastreia cada mensagem individual
   - Mantém histórico de tentativas
   - Armazena status e erros
   - Tabela: `envios_massa_detalhes`

3. **Processador de Envios**
   - Executa envios em background
   - Implementa lógica de retentativa
   - Gerencia estados e atualizações
   - Arquivo: `lib/auto-envio-massa.ts`

### Banco de Dados

#### Tabela: campanhas_envio_massa
```sql
CREATE TABLE campanhas_envio_massa (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(255),
  status ENUM('rascunho', 'agendada', 'enviando', 'pausada', 'concluida', 'erro'),
  template_id INT,
  instancia_id INT,
  intervalo_segundos INT DEFAULT 10,
  total_clientes INT DEFAULT 0,
  enviados INT DEFAULT 0,
  sucessos INT DEFAULT 0,
  falhas INT DEFAULT 0,
  data_inicio DATETIME,
  data_conclusao DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Tabela: envios_massa_detalhes
```sql
CREATE TABLE envios_massa_detalhes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campanha_id INT,
  cliente_id INT,
  status ENUM('pendente', 'enviado', 'erro') DEFAULT 'pendente',
  tentativas INT DEFAULT 0,
  message_id VARCHAR(255),
  mensagem_enviada TEXT,
  erro_mensagem TEXT,
  data_envio DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Fluxo de Processamento

1. **Inicialização da Campanha**
   - Verifica status da instância WhatsApp
   - Reseta contadores e status
   - Inicia processamento em background

2. **Processamento de Envios**
   - Busca envios pendentes em lotes
   - Processa template com dados do cliente
   - Envia mensagem via Evolution API
   - Atualiza status e contadores
   - Aguarda intervalo configurado

3. **Tratamento de Erros**
   - Máximo de 3 tentativas por envio
   - Registro detalhado de erros
   - Pausa automática se instância desconecta
   - Contabilização separada de falhas

## Correções Implementadas

### Problema: Envios Duplicados
**Causa:** Verificação duplicada de envios existentes e problemas de collation no banco.

**Solução:**
1. Removida verificação duplicada
2. Corrigido collation das tabelas para utf8mb4_unicode_ci
3. Adicionada verificação de status 'pendente' antes de atualizar

### Problema: Processamento Incorreto
**Causa:** Lógica complexa de seleção e atualização de envios.

**Solução:**
1. Simplificada lógica de seleção do próximo envio
2. Melhorada atualização de status após envio
3. Adicionada validação de número de telefone

## Manutenção e Monitoramento

### Logs
O sistema mantém logs detalhados em vários níveis:
- Início/fim de processamento de campanhas
- Status de cada envio individual
- Erros e exceções
- Contadores de sucesso/falha

### Pontos de Monitoramento
1. Status das instâncias WhatsApp
2. Taxa de sucesso/falha dos envios
3. Tempo médio de processamento
4. Fila de envios pendentes

## Criação de Nova Campanha

1. **Configuração Inicial**
   ```sql
   INSERT INTO campanhas_envio_massa (
     nome,
     status,
     template_id,
     instancia_id,
     intervalo_segundos
   ) VALUES (
     'Nome da Campanha',
     'rascunho',
     template_id,
     instancia_id,
     10
   );
   ```

2. **Adição de Destinatários**
   ```sql
   INSERT INTO envios_massa_detalhes (
     campanha_id,
     cliente_id,
     status
   ) SELECT 
     campanha_id,
     id,
     'pendente'
   FROM clientes
   WHERE /* seus critérios de filtro */;
   ```

3. **Iniciar Campanha**
   ```typescript
   await executeQuery(`
     UPDATE campanhas_envio_massa 
     SET 
       status = 'enviando',
       data_inicio = NOW()
     WHERE id = ?
   `, [campanhaId]);
   ```

## Considerações de Escalabilidade

1. **Controle de Taxa**
   - Intervalo configurável entre envios
   - Processamento em lotes pequenos
   - Limite de campanhas simultâneas

2. **Recursos do Sistema**
   - Monitorar uso de memória
   - Controlar número de conexões DB
   - Gerenciar timeouts da API

3. **Recuperação de Falhas**
   - Sistema de retentativas
   - Estado persistente
   - Logs detalhados

## Próximos Passos e Melhorias

1. **Monitoramento**
   - Implementar dashboard de métricas
   - Alertas automáticos
   - Visualização de tendências

2. **Performance**
   - Otimizar queries
   - Implementar cache
   - Melhorar paralelismo

3. **Funcionalidades**
   - Agendamento avançado
   - Templates dinâmicos
   - Relatórios detalhados

## Troubleshooting

### Problemas Comuns

1. **Mensagens Não Enviadas**
   - Verificar status da instância
   - Confirmar formato do número
   - Checar logs de erro

2. **Campanha Pausada**
   - Verificar conexão da instância
   - Checar limites de API
   - Validar template

3. **Envios Lentos**
   - Ajustar intervalo entre envios
   - Verificar performance do banco
   - Monitorar uso de recursos

### Comandos Úteis

```sql
-- Status geral da campanha
SELECT * FROM campanhas_envio_massa WHERE id = ?;

-- Detalhes dos envios
SELECT status, COUNT(*) as total
FROM envios_massa_detalhes
WHERE campanha_id = ?
GROUP BY status;

-- Últimos erros
SELECT cliente_id, erro_mensagem, tentativas
FROM envios_massa_detalhes
WHERE campanha_id = ? AND status = 'erro'
ORDER BY updated_at DESC
LIMIT 10;
``` 