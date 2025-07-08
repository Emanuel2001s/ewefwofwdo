# 🚀 Deploy na VPS - Dashboard IPTV

## 📋 **PRÉ-REQUISITOS**

### **VPS Requirements**
- Ubuntu 20.04+ ou Debian 11+
- Mínimo 4GB RAM
- Mínimo 40GB de armazenamento
- Traefik já instalado e configurado
- Portainer já instalado
- Acesso SSH root

### **Configurações Necessárias**
- Domínio configurado apontando para o servidor
- GitHub repository com o código
- Chave SSH para deploy automatizado

---

## 🛠️ **CONFIGURAÇÃO INICIAL**

### **1. Preparação da VPS**

```bash
# Conectar na VPS
ssh root@seu-servidor.com

# Baixar e executar script de setup
curl -fsSL https://raw.githubusercontent.com/seu-usuario/dashboard-iptv/main/deploy/setup-vps.sh | bash

# Ou clonar o repositório e executar manualmente
git clone https://github.com/seu-usuario/dashboard-iptv.git /opt/dashboard-iptv
cd /opt/dashboard-iptv
chmod +x deploy/setup-vps.sh
./deploy/setup-vps.sh
```

### **2. Configuração do Ambiente**

```bash
# Editar arquivo de ambiente
cd /opt/dashboard-iptv
nano .env

# Configurar variáveis obrigatórias:
DOMAIN=dashboard.seudominio.com
EVOLUTION_API_KEY=sua_api_key_evolution
```

### **3. Configuração do Traefik**

Certifique-se de que o Traefik está configurado para usar a rede `traefik-network`:

```yaml
# docker-compose.yml do Traefik
networks:
  traefik-network:
    external: true
```

---

## 🔧 **CONFIGURAÇÃO DOS CRONS**

### **Crons Configurados Automaticamente**

| Cron | Frequência | Descrição |
|------|------------|-----------|
| `processar-envios` | A cada 2 minutos | Processar campanhas ativas (verifica configuração da campanha) |
| `whatsapp-notifications` | A cada hora | Notificações WhatsApp (executa no horário configurado) |
| `update-expired` | A cada hora | Atualização de clientes (executa no horário configurado) |
| `sync-config` | A cada 10 minutos | Sincroniza configurações do sistema |
| `cleanup-logs` | Domingo 3:00 AM | Limpeza e rotação de logs |
| `health-check` | A cada 30 minutos | Verificação de saúde da aplicação |

### **Estrutura dos Crons**

```
cron/
├── crontab                 # Configuração do cron
├── start.sh               # Script de inicialização
└── scripts/
    ├── processar-envios.sh # Processamento de envios (verifica campanhas)
    ├── whatsapp-notifications.sh # Notificações (horário configurável)
    ├── update-expired.sh  # Atualização de expirados (horário configurável)
    ├── sync-config.sh     # Sincronização de configurações
    ├── health-check.sh    # Health check
    └── cleanup-logs.sh    # Limpeza de logs
```

### **Crons Configuráveis**

Os crons agora são **independentes** e **configuráveis**:

#### **Notificações WhatsApp**
- Executa **a cada hora**
- Só envia notificações no **horário configurado** nas configurações do sistema
- Pode ser ativado/desativado nas configurações

#### **Atualização de Clientes**
- Executa **a cada hora**
- Só processa no **horário configurado** nas configurações do sistema
- Executa no mesmo horário das notificações

#### **Envio em Massa**
- Executa **a cada 2 minutos**
- Verifica se há campanhas ativas
- Respeita o **tempo configurado** na criação da campanha

### **Configuração do Horário**

```bash
# Configurar horário das notificações (exemplo: 09:00)
# Através da interface web → Configurações → Notificações
# Ou via API: PUT /api/configuracoes
{
  "notificacao_horario": "09:00",
  "notificacao_ativa": true
}
```

### **Logs dos Crons**

```bash
# Ver logs em tempo real
cd /opt/dashboard-iptv
docker-compose logs -f cron

# Logs específicos
tail -f cron/logs/processar-envios.log
tail -f cron/logs/whatsapp-notifications.log
tail -f cron/logs/update-expired.log
tail -f cron/logs/sync-config.log
```

---

## 🤖 **CI/CD com GitHub Actions**

### **Configuração dos Secrets**

No GitHub, vá em **Settings → Secrets → Actions** e adicione:

```
SSH_PRIVATE_KEY: sua_chave_ssh_privada
HOST: ip_do_servidor
USERNAME: usuario_ssh
DOMAIN: dashboard.seudominio.com
```

### **Fluxo de Deploy**

1. **Push para main** → Trigger automático
2. **Testes** → Lint e build
3. **Deploy** → SSH para VPS e atualização
4. **Verificação** → Health check automático

### **Deploy Manual**

```bash
# Na VPS
cd /opt/dashboard-iptv
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 **MONITORAMENTO**

### **Comandos Úteis**

```bash
# Status dos containers
docker-compose ps

# Logs em tempo real
docker-compose logs -f

# Logs específicos
docker-compose logs app
docker-compose logs mysql
docker-compose logs cron

# Estatísticas de uso
docker stats

# Espaço em disco
df -h
du -sh /opt/dashboard-iptv
```

### **Health Checks**

```bash
# Verificar saúde da aplicação
curl https://dashboard.seudominio.com/api/health

# Verificar banco de dados
docker exec dashboard-iptv-mysql mysqladmin ping -h localhost -u root -p
```

### **Monitoramento via Portainer**

Acesse o Portainer para monitorar:
- Status dos containers
- Logs em tempo real
- Estatísticas de recursos
- Reiniciar serviços

---

## 💾 **BACKUP E RECUPERAÇÃO**

### **Backup Automático**

```bash
# Configurado automaticamente às 2:00 AM
/opt/dashboard-iptv/deploy/backup.sh

# Backup manual
cd /opt/dashboard-iptv
./deploy/backup.sh
```

### **Localização dos Backups**

```
/opt/backups/dashboard-iptv/
├── database_backup_20231201_020000.sql.gz
├── uploads_backup_20231201_020000.tar.gz
└── config_backup_20231201_020000.tar.gz
```

### **Recuperação**

```bash
# Restaurar banco de dados
gunzip database_backup_20231201_020000.sql.gz
docker exec -i dashboard-iptv-mysql mysql -u root -p < database_backup_20231201_020000.sql

# Restaurar uploads
tar -xzf uploads_backup_20231201_020000.tar.gz -C /opt/dashboard-iptv/public/

# Restaurar configurações
tar -xzf config_backup_20231201_020000.tar.gz -C /opt/dashboard-iptv/
```

---

## 🔒 **SEGURANÇA**

### **Configurações Aplicadas**

- **Firewall UFW** configurado
- **Fail2ban** para proteção contra ataques
- **SSL/TLS** via Let's Encrypt (Traefik)
- **Containers não-root**
- **Secrets** em variáveis de ambiente
- **Dados sensíveis** criptografados

### **Atualizações**

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Atualizar Docker images
cd /opt/dashboard-iptv
docker-compose pull
docker-compose up -d
```

---

## 🐛 **TROUBLESHOOTING**

### **Problemas Comuns**

#### **Aplicação não inicia**
```bash
# Verificar logs
docker-compose logs app

# Verificar variáveis de ambiente
docker-compose exec app env

# Reiniciar
docker-compose restart app
```

#### **Banco não conecta**
```bash
# Verificar status do MySQL
docker-compose logs mysql

# Testar conexão
docker-compose exec app ping mysql

# Verificar credenciais
docker-compose exec mysql mysql -u root -p
```

#### **Crons não executam**
```bash
# Verificar container cron
docker-compose logs cron

# Verificar configuração
docker-compose exec cron crontab -l

# Testar script manualmente
docker-compose exec cron /app/scripts/daily-tasks.sh
```

#### **SSL não funciona**
```bash
# Verificar Traefik
docker logs traefik

# Verificar DNS
dig dashboard.seudominio.com

# Forçar renovação SSL
docker exec traefik traefik certificates
```

---

## 📈 **OTIMIZAÇÃO**

### **Performance**

```bash
# Configurar swap se necessário
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Otimizar MySQL
# Configurações em mysql/conf/custom.cnf
```

### **Monitoramento Avançado**

```bash
# Instalar ferramentas de monitoramento
apt install htop iotop nethogs

# Configurar alertas
# (Pode ser integrado com Slack, Discord, etc.)
```

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Configurar alertas** para falhas
2. **Implementar Redis** para cache
3. **Configurar CDN** para assets
4. **Implementar métricas** com Prometheus
5. **Configurar log aggregation** com ELK Stack

---

## 📞 **SUPORTE**

Para problemas ou dúvidas:
1. Verificar logs dos containers
2. Consultar esta documentação
3. Verificar issues no GitHub
4. Contatar o desenvolvedor

**Logs importantes:**
- Aplicação: `docker-compose logs app`
- Banco: `docker-compose logs mysql`
- Cron: `docker-compose logs cron`
- Sistema: `/var/log/syslog` 