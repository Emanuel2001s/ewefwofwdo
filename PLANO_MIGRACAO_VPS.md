# 🚀 **PLANO DE MIGRAÇÃO - VERCEL → VPS**

## 📊 **RESUMO DA MIGRAÇÃO**

### **Atual (Vercel)**
- ✅ Deploy automático via GitHub
- ✅ Cron job diário (9:00 AM)
- ✅ Variáveis de ambiente automáticas
- ✅ SSL/HTTPS automático
- ❌ Limitações de cron jobs
- ❌ Dependência de serviços externos

### **Futuro (VPS)**
- ✅ Deploy via GitHub Actions
- ✅ **6 cron jobs** configurados
- ✅ Controle total sobre infraestrutura
- ✅ Backup automático
- ✅ Monitoramento avançado
- ✅ Traefik + Docker + MySQL local

---

## 🔧 **CONFIGURAÇÃO ATUAL DOS CRONS**

### **Vercel (Atual)**
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-tasks",
      "schedule": "0 9 * * *"  // 9:00 AM diário
    }
  ]
}
```

### **VPS (Futuro)**
```bash
# Processamento de envios em massa (a cada 2 minutos)
*/2 * * * * processar-envios.sh

# Notificações WhatsApp (a cada hora - horário configurável)
0 * * * * whatsapp-notifications.sh

# Atualização de clientes expirados (a cada hora - horário configurável)
0 * * * * update-expired.sh

# Sincronização de configurações (a cada 10 minutos)
*/10 * * * * sync-config.sh

# Limpeza de logs (domingo às 3:00 AM)
0 3 * * 0 cleanup-logs.sh

# Health check (a cada 30 minutos)
*/30 * * * * health-check.sh
```

---

## 🎯 **PLANO DE EXECUÇÃO**

### **FASE 1: PREPARAÇÃO (30 minutos)**
1. **Configurar VPS** com script `deploy/setup-vps.sh`
2. **Configurar DNS** apontando para VPS
3. **Configurar variáveis** de ambiente
4. **Testar conectividade** básica

### **FASE 2: DEPLOY (15 minutos)**
1. **Push código** para GitHub
2. **Configurar GitHub Actions** secrets
3. **Executar primeiro deploy**
4. **Verificar funcionamento**

### **FASE 3: CRONS (10 minutos)**
1. **Verificar containers** cron
2. **Testar execução** manual
3. **Validar logs** de cron
4. **Confirmar automação**

### **FASE 4: VALIDAÇÃO (15 minutos)**
1. **Teste completo** da aplicação
2. **Verificar Evolution API**
3. **Testar envio massa**
4. **Validar backups**

---

## 🚀 **COMANDOS DE EXECUÇÃO**

### **1. Setup Inicial**
```bash
# Na VPS
curl -fsSL https://raw.githubusercontent.com/seu-usuario/dashboard-iptv/main/deploy/setup-vps.sh | bash
```

### **2. Configuração**
```bash
cd /opt/dashboard-iptv
nano .env  # Configurar variáveis
docker-compose up -d
```

### **3. Verificação**
```bash
# Status
docker-compose ps

# Logs
docker-compose logs -f

# Health check
curl https://dashboard.seudominio.com/api/health
```

---

## 📋 **CHECKLIST DE MIGRAÇÃO**

### **✅ PRÉ-REQUISITOS**
- [ ] VPS com 4GB+ RAM
- [ ] Traefik instalado
- [ ] Portainer instalado
- [ ] Domínio configurado
- [ ] SSH configurado

### **✅ CONFIGURAÇÃO**
- [ ] Código commitado no GitHub
- [ ] Scripts de deploy criados
- [ ] Variáveis de ambiente configuradas
- [ ] GitHub Actions secrets configurados

### **✅ DEPLOY**
- [ ] Primeiro deploy executado
- [ ] Aplicação acessível via HTTPS
- [ ] Banco de dados funcionando
- [ ] Crons executando

### **✅ VALIDAÇÃO**
- [ ] Login administrativo funcionando
- [ ] Clientes sendo listados
- [ ] Evolution API conectada
- [ ] Envio massa funcionando
- [ ] Backups sendo criados

---

## 📊 **COMPARATIVO DE FUNCIONALIDADES**

| Funcionalidade | Vercel | VPS |
|----------------|---------|-----|
| **Deploy Automático** | ✅ | ✅ |
| **SSL/HTTPS** | ✅ | ✅ |
| **Cron Jobs** | 1 job fixo | 6 jobs independentes |
| **Crons Configuráveis** | ❌ | ✅ |
| **Backup Automático** | ❌ | ✅ |
| **Logs Detalhados** | ❌ | ✅ |
| **Monitoramento** | ❌ | ✅ |
| **Controle Total** | ❌ | ✅ |
| **Custo** | Limitado | Fixo |

---

## 🔧 **ARQUIVOS CRIADOS**

### **Docker & Deploy**
- `Dockerfile` - Imagem da aplicação
- `docker-compose.yml` - Orquestração dos serviços
- `Dockerfile.cron` - Imagem para cron jobs
- `.github/workflows/deploy.yml` - CI/CD GitHub Actions

### **Cron Jobs**
- `cron/crontab` - Configuração dos crons
- `cron/start.sh` - Script de inicialização
- `cron/scripts/processar-envios.sh` - Processamento de envios (verifica campanhas)
- `cron/scripts/whatsapp-notifications.sh` - Notificações (horário configurável)
- `cron/scripts/update-expired.sh` - Atualização de expirados (horário configurável)
- `cron/scripts/sync-config.sh` - Sincronização de configurações
- `cron/scripts/health-check.sh` - Health check
- `cron/scripts/cleanup-logs.sh` - Limpeza de logs

### **Configuração**
- `mysql/conf/custom.cnf` - Configuração MySQL
- `deploy/setup-vps.sh` - Script de setup da VPS
- `deploy/backup.sh` - Script de backup
- `docs/DEPLOY_VPS.md` - Documentação completa

---

## 🚨 **PONTOS DE ATENÇÃO**

### **Segurança**
- Configurar firewall UFW
- Usar senhas fortes
- Configurar fail2ban
- Manter sistema atualizado

### **Performance**
- Monitorar uso de recursos
- Configurar swap se necessário
- Otimizar MySQL
- Rotacionar logs

### **Backup**
- Verificar backups diários
- Testar restauração
- Considerar backup externo
- Monitorar espaço em disco

---

## 📞 **SUPORTE**

### **Comandos Úteis**
```bash
# Status geral
docker-compose ps

# Ver logs
docker-compose logs -f app

# Reiniciar serviços
docker-compose restart

# Backup manual
./deploy/backup.sh

# Atualizar aplicação
git pull && docker-compose up -d --build
```

### **Troubleshooting**
1. **Aplicação não inicia**: Verificar logs com `docker-compose logs app`
2. **Banco não conecta**: Verificar credenciais no `.env`
3. **Crons não executam**: Verificar container cron com `docker-compose logs cron`
4. **SSL não funciona**: Verificar Traefik e DNS

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Executar migração** seguindo o plano
2. **Validar funcionamento** completo
3. **Configurar alertas** para falhas
4. **Implementar monitoring** avançado
5. **Otimizar performance** conforme necessário

---

## 🎉 **PRINCIPAIS MELHORIAS DOS CRONS**

### **✅ Crons Inteligentes e Configuráveis**
- **Notificações WhatsApp**: Executa no horário configurado nas configurações do sistema
- **Atualização de clientes**: Executa no horário configurado nas configurações do sistema
- **Envio em massa**: Verifica campanhas ativas e respeita tempo configurado na campanha
- **Sincronização**: Mantém configurações do sistema sempre atualizadas

### **✅ Flexibilidade Total**
- Alterar horário das notificações pela interface web
- Ativar/desativar notificações sem parar o sistema
- Configurar tempo de envio por campanha individualmente
- Monitorar cada cron independentemente

### **✅ Vantagens da VPS**
- **6 crons independentes** vs 1 cron unificado do Vercel
- **Horários configuráveis** via sistema vs horário fixo
- **Logs detalhados** de cada processo
- **Controle total** sobre a infraestrutura

**Tempo estimado total: 1h 30min** 