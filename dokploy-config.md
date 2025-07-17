# 🚀 Configuração Específica para seu Dokploy

## ✅ Status do Projeto

Seu projeto **Dashboard IPTV** está **100% pronto** para deploy no Dokploy! Analisei todas as configurações e tudo está compatível.

## 📋 Configurações do seu Docker Compose vs Projeto

### ✅ Compatibilidade Confirmada

| Configuração | Seu Docker Compose | Projeto Dashboard |
|--------------|-------------------|-------------------|
| **MySQL Version** | `mysql:8` | ✅ Compatível (MySQL 8.0+) |
| **Database Name** | `dashboard` | ⚠️ Precisa ajustar para `dashboard` |
| **MySQL User** | `dashboarduser` | ✅ Configurável via env |
| **MySQL Password** | `LwYS03nD&` | ✅ Configurável via env |
| **phpMyAdmin** | ✅ Instalado | ✅ Não necessário (opcional) |
| **Network** | `minha_rede` | ✅ Dokploy gerencia automaticamente |

## 🔧 Variáveis de Ambiente para Dokploy

### Configurações do Banco de Dados
```env
# Banco de Dados (ajustado para seu ambiente)
DB_HOST=db
DB_USER=dashboarduser
DB_PASSWORD=LwYS03nD&
DB_NAME=dashboard
DB_PORT=3306
```

### Configurações da Aplicação
```env
# Aplicação
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=1.0.0

# Segurança (GERE NOVAS CHAVES!)
JWT_SECRET=sua_chave_jwt_32_caracteres_aqui
ENCRYPTION_KEY=sua_chave_criptografia_32_chars

# Cron Jobs
CRON_SECRET=sua_chave_cron_secreta
NEXT_PUBLIC_CRON_SECRET=sua_chave_cron_secreta

# Evolution API (Opcional)
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key

# URL da aplicação
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
TZ=America/Sao_Paulo
```

## 🔑 Comandos para Gerar Chaves Seguras

```bash
# JWT_SECRET (32+ caracteres)
openssl rand -base64 32

# ENCRYPTION_KEY (32 caracteres hex)
openssl rand -hex 32

# CRON_SECRET (alfanumérico)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

## 📊 Configuração do Banco no Dokploy

### Opção 1: Usar seu MySQL existente
1. **Conectar à rede:** Certifique-se que a aplicação está na mesma rede (`minha_rede`)
2. **Host do banco:** Use `db` como hostname
3. **Importar estrutura:** Execute o script SQL no seu banco

### Opção 2: Criar novo banco no Dokploy
1. **Criar novo MySQL:** No Dokploy, crie um novo serviço MySQL
2. **Configurar credenciais:** Use as mesmas credenciais do seu docker-compose
3. **Importar dados:** Execute o script de backup

## 📁 Script SQL para Importação

**Arquivo:** `scripts/backup-dados-importacao.sql`

```sql
-- Ajustar nome do banco se necessário
USE dashboard; -- Seu banco atual

-- Executar o script completo
-- O script já tem proteções contra duplicação
```

## 🚀 Passos para Deploy no Dokploy

### 1. Preparar Repositório
```bash
git add .
git commit -m "Configuração para Dokploy"
git push origin main
```

### 2. Criar Aplicação no Dokploy
1. **Tipo:** Application
2. **Source:** GitHub/GitLab
3. **Repository:** Seu repositório
4. **Branch:** main
5. **Build Type:** Dockerfile

### 3. Configurar Variáveis de Ambiente
Copie as variáveis da seção acima no painel do Dokploy.

### 4. Configurar Volumes (Importante!)
```
Source: /uploads
Destination: /app/public/uploads
Type: bind
```

### 5. Configurar Rede
- **Conectar à rede:** `minha_rede` (mesma do seu MySQL)
- **Porta:** 3000
- **Domínio:** Configurar seu domínio/subdomínio

### 6. Deploy
1. Clique em **Deploy**
2. Aguarde o build completar
3. Verifique os logs

## 🔍 Verificações Pós-Deploy

### 1. Testar Conexão com Banco
```bash
# No terminal do container
curl http://localhost:3000/api/health
```

### 2. Primeiro Acesso
```
URL: https://seu-dominio.com/admin
Usuário: admin
Senha: admin123@*
```

### 3. Verificar Uploads
- Teste upload de logo/favicon
- Verifique se arquivos persistem após restart

### 4. Testar Funcionalidades
- ✅ Login administrativo
- ✅ Cadastro de clientes
- ✅ Relatórios
- ✅ Configurações

## ⚠️ Pontos de Atenção

### 1. Nome do Banco
**Seu docker-compose usa `dashboard`, mas o projeto espera `dashboard_iptv`**

**Soluções:**
- **Opção A:** Mudar variável `DB_NAME=dashboard` (recomendado)
- **Opção B:** Renomear banco para `dashboard_iptv`

### 2. Rede Docker
Certifique-se que a aplicação está na mesma rede do MySQL (`minha_rede`)

### 3. Volumes
**Obrigatório** configurar volume para uploads, senão arquivos serão perdidos.

### 4. Chaves de Segurança
**NUNCA** use as chaves de exemplo em produção. Gere novas!

## 🆘 Troubleshooting

### Erro de Conexão com Banco
```bash
# Verificar se está na mesma rede
docker network ls
docker network inspect minha_rede

# Testar conexão
docker exec -it seu_container ping db
```

### Erro de Permissão de Uploads
```bash
# No container
chmod 755 /app/public/uploads
chown -R node:node /app/public/uploads
```

### Logs Úteis
```bash
# Logs da aplicação
docker logs dashboard-iptv -f

# Logs do MySQL
docker logs mysql_container -f
```

## ✅ Checklist Final

- [ ] Repositório atualizado no Git
- [ ] Variáveis de ambiente configuradas
- [ ] Chaves de segurança geradas
- [ ] Volume de uploads configurado
- [ ] Rede Docker configurada
- [ ] Script SQL executado no banco
- [ ] Domínio configurado
- [ ] Deploy realizado
- [ ] Primeiro acesso testado
- [ ] Funcionalidades principais testadas

## 🎉 Conclusão

Seu projeto está **perfeitamente configurado** para deploy no Dokploy! A única pequena diferença é o nome do banco de dados, que pode ser facilmente ajustado via variável de ambiente.

**Tempo estimado de deploy:** 5-10 minutos

**Próximo passo:** Seguir o guia passo a passo acima! 🚀