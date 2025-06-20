# 🔄 Configuração de Atualização Automática de Clientes Vencidos

## 📋 Resumo

O sistema IPTV Manager possui **atualização automática** de clientes vencidos que:
- ✅ Executa automaticamente ao carregar a página de clientes
- ✅ Executa automaticamente em todas as consultas da API
- ✅ Pode ser executada via cron job para execução periódica
- ✅ Atualiza o status de clientes com `data_vencimento < hoje` para `inativo`

## 🚀 Métodos de Execução Automática

### 1. **Automático na Interface** ⚡
- Executa sempre que a página de clientes é carregada
- Executa sempre que a API de clientes é consultada
- **Não requer configuração adicional**

### 2. **Vercel Cron (Recomendado para Vercel)** ☁️

Se você está usando Vercel, o arquivo `vercel.json` já está configurado:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-expired",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Configuração:**
1. Adicione a variável de ambiente no Vercel:
   ```
   CRON_SECRET=sua-chave-secreta-aqui
   ```
2. O cron executará diariamente às 6:00 AM

### 3. **Cron Job no Servidor Linux** 🐧

Para servidores Linux/Ubuntu, adicione ao crontab:

```bash
# Editar crontab
crontab -e

# Adicionar linha para executar diariamente às 6:00 AM
0 6 * * * cd /caminho/para/projeto && node scripts/update-expired-clients.js >> /var/log/iptv-cron.log 2>&1
```

### 4. **Windows Task Scheduler** 🪟

Para Windows Server:

1. Abra o "Agendador de Tarefas"
2. Crie nova tarefa
3. Configure para executar diariamente
4. Ação: Executar `node scripts/update-expired-clients.js`

### 5. **Docker/PM2** 🐳

Se usando PM2, adicione ao ecosystem:

```javascript
module.exports = {
  apps: [
    // ... sua aplicação principal
    {
      name: 'iptv-cron',
      script: 'scripts/update-expired-clients.js',
      cron_restart: '0 6 * * *',
      autorestart: false,
      watch: false
    }
  ]
}
```

## 🔧 Configuração Manual

### Endpoint de Cron Job
```
GET/POST /api/cron/update-expired
Authorization: Bearer YOUR_CRON_SECRET
```

### Script Standalone
```bash
# Executar manualmente
node scripts/update-expired-clients.js

# Com variáveis de ambiente
DB_HOST=localhost DB_USER=root DB_PASSWORD=senha node scripts/update-expired-clients.js
```

## 📊 Logs e Monitoramento

### Logs do Sistema
- ✅ Logs automáticos no console quando clientes são atualizados
- ✅ Timestamp de cada execução
- ✅ Detalhes dos clientes atualizados

### Exemplo de Log:
```
🕐 [2024-01-15T06:00:00.000Z] Iniciando atualização automática de clientes vencidos...
📋 Encontrados 3 cliente(s) vencido(s):
   - João Silva (Vencimento: 14/01/2024)
   - Maria Santos (Vencimento: 13/01/2024)
   - Pedro Costa (Vencimento: 12/01/2024)
✅ 3 cliente(s) atualizado(s) para status 'inativo'.
📝 Atualização automática concluída em: 2024-01-15T06:00:01.234Z
```

## ⚙️ Variáveis de Ambiente

```env
# Banco de dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=iptv_manager
DB_PORT=3306

# Cron job (opcional)
CRON_SECRET=sua-chave-secreta-para-cron
```

## 🔍 Verificação de Funcionamento

### 1. Teste Manual
```bash
# Executar script
node scripts/update-expired-clients.js
```

### 2. Teste via API
```bash
# Com curl
curl -X POST http://localhost:3000/api/cron/update-expired \
  -H "Authorization: Bearer sua-chave-secreta"
```

### 3. Verificar Logs
- Verifique os logs do console da aplicação
- Verifique se clientes vencidos estão sendo atualizados

## 🎯 Frequência Recomendada

- **Mínimo**: 1x por dia (6:00 AM)
- **Recomendado**: 2x por dia (6:00 AM e 18:00 PM)
- **Máximo**: A cada hora (para alta demanda)

## 🛡️ Segurança

- ✅ Endpoint de cron protegido por token
- ✅ Validação de autorização
- ✅ Logs de auditoria
- ✅ Tratamento de erros

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs da aplicação
2. Teste o script manualmente
3. Verifique as variáveis de ambiente
4. Confirme conectividade com o banco de dados 