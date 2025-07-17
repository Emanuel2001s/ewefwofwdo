# 🚀 Deploy Dashboard IPTV via Dokploy

> **Guia Completo para Deploy em Produção**

Este documento contém todas as instruções necessárias para fazer o deploy do **Dashboard IPTV** em uma VPS usando Dokploy com integração GitHub.

## 📋 Visão Geral do Projeto

- **Framework:** Next.js 15 com TypeScript
- **Banco de Dados:** MySQL 8.0+
- **Integrações:** Evolution API (WhatsApp), Sistema de Uploads
- **Funcionalidades:** Gestão de clientes IPTV, notificações WhatsApp, relatórios

## 🔧 Pré-requisitos

### VPS Requirements
- **RAM:** Mínimo 2GB (Recomendado 4GB+)
- **CPU:** 2 cores ou mais
- **Storage:** 20GB+ SSD
- **OS:** Ubuntu 20.04+ ou Debian 11+
- **Docker:** Instalado e funcionando
- **Dokploy:** Instalado e configurado

### Serviços Externos
- **MySQL:** Banco de dados (pode ser no mesmo servidor)
- **Evolution API:** Para integração WhatsApp (opcional)
- **Domínio:** Para acesso em produção (recomendado)

## 📦 1. Preparação do Repositório

### 1.1 Checklist Pré-Deploy

- [ ] ✅ Dockerfile otimizado na raiz do projeto
- [ ] ✅ .gitignore configurado (não sobe .env*)
- [ ] ✅ package.json com scripts corretos
- [ ] ✅ Código testado localmente
- [ ] ✅ Backup do banco de dados atual

### 1.2 Push para GitHub

```bash
# Clone ou navegue até o projeto
cd dashboard-iptv-v0

# Adicione todos os arquivos (exceto .env)
git add .
git commit -m "feat: preparação para deploy dokploy"
git push origin main
```

## 🐳 2. Configuração Docker

### 2.1 Dockerfile (Já Configurado)

O projeto já possui um Dockerfile otimizado:

```dockerfile
# Dockerfile para Next.js/Node.js
FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar tsconfig.json explicitamente
COPY tsconfig.json ./tsconfig.json

# Copiar o restante do código
COPY . .

# Limpar cache do Next.js antes do build
RUN rm -rf .next

# Build do projeto Next.js
RUN npm run build

# Expor a porta padrão do Next.js
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
```

## 🗄️ 3. Configuração do Banco de Dados

### 3.1 Criação do Banco MySQL

**Opção A: MySQL no mesmo servidor (Dokploy)**

1. No painel Dokploy, crie um novo serviço MySQL:
   - **Nome:** `mysql-dashboard-iptv`
   - **Versão:** `mysql:8.0`
   - **Root Password:** `[senha-segura]`
   - **Database:** `dashboard_iptv`
   - **Port:** `3306`

**Opção B: MySQL externo**

```sql
-- Conecte no seu MySQL e execute:
CREATE DATABASE dashboard_iptv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dashboard_user'@'%' IDENTIFIED BY 'senha_segura_aqui';
GRANT ALL PRIVILEGES ON dashboard_iptv.* TO 'dashboard_user'@'%';
FLUSH PRIVILEGES;
```

### 3.2 Importação da Estrutura

O projeto inclui um script SQL completo em `scripts/backup-dados-importacao.sql`:

```bash
# Execute no MySQL
mysql -u root -p dashboard_iptv < scripts/backup-dados-importacao.sql
```

**Estrutura criada:**
- ✅ Tabelas: `usuarios`, `clientes`, `planos`, `servidores`, `configuracoes`
- ✅ View: `vw_clientes_vencimento`
- ✅ Índices otimizados
- ✅ Dados iniciais (admin, configurações padrão)

## 🔐 4. Variáveis de Ambiente

### 4.1 Variáveis Obrigatórias

Configure no painel Dokploy (Environment Variables):

```env
# === BANCO DE DADOS ===
# Banco de Dados (ajuste conforme seu ambiente)
DB_HOST=db  # ou IP do seu MySQL se externo
DB_USER=dashboarduser  # ou seu usuário MySQL
DB_PASSWORD=sua_senha_mysql_segura
DB_NAME=dashboard  # ou dashboard_iptv se preferir
DB_PORT=3306

# === APLICAÇÃO ===
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=1.0.0
JWT_SECRET=sua_chave_jwt_super_secreta_aqui_32chars
ENCRYPTION_KEY=sua_chave_criptografia_32_caracteres

# === CRON JOBS ===
CRON_SECRET=sua_chave_secreta_para_cron_jobs
NEXT_PUBLIC_CRON_SECRET=sua_chave_secreta_para_cron_jobs

# === EVOLUTION API (OPCIONAL) ===
# Deixe em branco se não usar WhatsApp
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key_evolution
```

### 4.2 Geração de Chaves Seguras

```bash
# JWT_SECRET (32+ caracteres)
openssl rand -base64 32

# ENCRYPTION_KEY (exatamente 32 caracteres)
openssl rand -hex 16

# CRON_SECRET
openssl rand -base64 24
```

## 🚀 5. Deploy no Dokploy

### 5.1 Criar Aplicação

1. **Acesse o painel Dokploy:** `http://seu-ip:3000`
2. **Clique em "Create Application"**
3. **Configure:**
   - **Name:** `dashboard-iptv`
   - **Source:** GitHub
   - **Repository:** `https://github.com/seu-usuario/seu-repo.git`
   - **Branch:** `main`
   - **Build Type:** Docker
   - **Dockerfile Path:** `./Dockerfile`

### 5.2 Configurar Volumes

**Volume para Uploads (IMPORTANTE):**

```
Host Path: /var/dokploy/uploads/dashboard-iptv
Container Path: /app/public/uploads
```

### 5.3 Configurar Rede

- **Port:** `3000`
- **Domain:** `dashboard.seudominio.com` (opcional)
- **SSL:** Ativado (se usar domínio)

### 5.4 Deploy

1. **Adicione todas as variáveis de ambiente**
2. **Configure o volume de uploads**
3. **Clique em "Deploy"**
4. **Monitore os logs durante o build**

## ⚙️ 6. Configuração Pós-Deploy

### 6.1 Primeiro Acesso

```
URL: http://seu-ip:3000 (ou seu domínio)
Usuário: admin
Senha: admin123@*
```

### 6.2 Configurações Iniciais

1. **Altere a senha do admin**
2. **Configure o nome do sistema**
3. **Faça upload da logo e favicon**
4. **Configure Evolution API (se usar)**
5. **Teste envio de notificações**

### 6.3 Cron Jobs (Opcional)

Para automatizar tarefas, configure no servidor:

```bash
# Edite o crontab
crontab -e

# Adicione (ajuste a URL):
# Atualizar clientes vencidos diariamente às 9h
0 9 * * * curl -X POST -H "Authorization: Bearer sua_cron_secret" http://localhost:3000/api/cron/daily-tasks

# Processar envios em massa a cada 5 minutos
*/5 * * * * curl -X POST -H "Authorization: Bearer sua_cron_secret" http://localhost:3000/api/cron/processar-envios
```

## 🔍 7. Troubleshooting

### 7.1 Problemas Comuns

**❌ Erro de conexão com banco:**
```bash
# Verifique as variáveis de ambiente
docker logs dashboard-iptv

# Teste conexão manual
mysql -h DB_HOST -u DB_USER -p DB_NAME
```

**❌ Build falha:**
```bash
# Limpe o cache do Docker
docker system prune -a

# Verifique se todas as dependências estão no package.json
```

**❌ Uploads não funcionam:**
```bash
# Verifique permissões do volume
sudo chown -R 1000:1000 /var/dokploy/uploads/dashboard-iptv
sudo chmod -R 755 /var/dokploy/uploads/dashboard-iptv
```

**❌ Evolution API não conecta:**
- Verifique se a URL está correta (sem barra final)
- Confirme se a API Key está válida
- Teste a conexão manualmente

### 7.2 Logs Úteis

```bash
# Logs da aplicação
docker logs dashboard-iptv -f

# Logs do MySQL (se no Dokploy)
docker logs mysql-dashboard-iptv -f

# Status dos containers
docker ps -a
```

## 📊 8. Monitoramento

### 8.1 Health Check

O projeto inclui endpoint de saúde:

```bash
# Verificar status da aplicação
curl http://seu-ip:3000/api/health

# Resposta esperada:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### 8.2 Métricas Importantes

- **CPU:** < 80% em operação normal
- **RAM:** < 1GB para aplicação básica
- **Disk:** Monitore crescimento de uploads
- **Network:** Verifique latência do banco

## 🔄 9. Atualizações

### 9.1 Deploy de Novas Versões

```bash
# 1. Faça as alterações no código
# 2. Commit e push para GitHub
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# 3. No Dokploy, clique em "Redeploy"
# 4. Monitore os logs durante o deploy
```

### 9.2 Backup Antes de Atualizações

```bash
# Backup do banco
mysqldump -u root -p dashboard_iptv > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup dos uploads
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/dokploy/uploads/dashboard-iptv/
```

## ✅ 10. Checklist Final

### Pré-Deploy
- [ ] ✅ VPS com recursos adequados
- [ ] ✅ Dokploy instalado e funcionando
- [ ] ✅ MySQL configurado e acessível
- [ ] ✅ Código no GitHub (sem .env)
- [ ] ✅ Dockerfile testado

### Durante Deploy
- [ ] ✅ Aplicação criada no Dokploy
- [ ] ✅ Repositório GitHub conectado
- [ ] ✅ Todas as variáveis de ambiente configuradas
- [ ] ✅ Volume de uploads mapeado
- [ ] ✅ Porta 3000 exposta
- [ ] ✅ Deploy executado com sucesso

### Pós-Deploy
- [ ] ✅ Aplicação acessível via browser
- [ ] ✅ Login admin funcionando
- [ ] ✅ Banco de dados populado
- [ ] ✅ Upload de arquivos testado
- [ ] ✅ Evolution API configurada (se usar)
- [ ] ✅ Cron jobs agendados (se necessário)
- [ ] ✅ Domínio e SSL configurados (se usar)
- [ ] ✅ Backup inicial realizado

## 📚 11. Recursos Adicionais

### Documentação
- [Dokploy Official Docs](https://docs.dokploy.com/)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [MySQL 8.0 Reference](https://dev.mysql.com/doc/refman/8.0/en/)
- [Evolution API Docs](https://doc.evolution-api.com/)

### Suporte
- **GitHub Issues:** Para bugs e melhorias
- **Dokploy Community:** Para questões de deploy
- **MySQL Community:** Para problemas de banco

---

## 🎉 Conclusão

Seguindo este guia, você terá o **Dashboard IPTV** rodando em produção com:

- ✅ **Alta disponibilidade** com Docker
- ✅ **Persistência de dados** com volumes
- ✅ **Segurança** com variáveis de ambiente
- ✅ **Monitoramento** com logs e health checks
- ✅ **Escalabilidade** para crescimento futuro

**🚀 Seu dashboard está pronto para produção!**

---

> **💡 Dica:** Mantenha este documento atualizado conforme evolui o projeto. Documente qualquer customização específica do seu ambiente.

**📞 Precisa de ajuda?** Consulte a documentação oficial ou abra uma issue no repositório!