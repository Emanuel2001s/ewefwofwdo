# 🎯 Dashboard IPTV

> **Sistema completo de gestão de clientes IPTV com integração WhatsApp**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?logo=mysql)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![Dokploy](https://img.shields.io/badge/Dokploy-Compatible-green)](https://dokploy.com/)

## 📋 Funcionalidades

### 👥 Gestão de Clientes
- ✅ Cadastro completo de clientes IPTV
- ✅ Controle de vencimentos e renovações
- ✅ Gestão de planos e servidores
- ✅ Status automático (ativo/vencido/inativo)
- ✅ Histórico de pagamentos

### 📱 Integração WhatsApp
- ✅ Notificações automáticas de vencimento
- ✅ Envio em massa de mensagens
- ✅ Templates personalizáveis
- ✅ Integração com Evolution API
- ✅ QR Code para conexão

### 📊 Relatórios e Dashboard
- ✅ Dashboard administrativo completo
- ✅ Relatórios de vencimentos
- ✅ Estatísticas de clientes
- ✅ Exportação de dados
- ✅ Gráficos interativos

### ⚙️ Administração
- ✅ Painel administrativo completo
- ✅ Configurações do sistema
- ✅ Upload de logo e favicon
- ✅ Gestão de usuários
- ✅ Logs de atividades

## 🚀 Deploy Rápido

### Opção 1: Dokploy (Recomendado)

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/dashboard-iptv.git
cd dashboard-iptv

# 2. Siga o guia completo em:
# DEPLOY_DOKPLOY.md
```

### Opção 2: Docker Compose

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/dashboard-iptv.git
cd dashboard-iptv

# 2. Configure as variáveis no docker-compose.yml
# 3. Inicie os serviços
docker-compose up -d

# 4. Acesse: http://localhost:3000
# Login: admin / admin123@*
```

### Opção 3: Desenvolvimento Local

```bash
# 1. Clone e instale dependências
git clone https://github.com/seu-usuario/dashboard-iptv.git
cd dashboard-iptv
npm install

# 2. Configure o banco MySQL
# 3. Configure as variáveis de ambiente (.env.local)
# 4. Execute as migrações
mysql -u root -p dashboard_iptv < scripts/backup-dados-importacao.sql

# 5. Inicie o desenvolvimento
npm run dev

# Acesse: http://localhost:3000
```

## 🔧 Configuração

### Variáveis de Ambiente Obrigatórias

```env
# Banco de Dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=dashboard_iptv
DB_PORT=3306

# Aplicação
NODE_ENV=production
JWT_SECRET=sua_chave_jwt_32_caracteres
ENCRYPTION_KEY=sua_chave_criptografia_32_chars

# Cron Jobs
CRON_SECRET=sua_chave_cron
NEXT_PUBLIC_CRON_SECRET=sua_chave_cron

# Evolution API (Opcional)
EVOLUTION_API_URL=https://sua-api.com
EVOLUTION_API_KEY=sua_api_key
```

### Estrutura do Banco

O projeto inclui script SQL completo:

```bash
# Execute no MySQL
mysql -u root -p dashboard_iptv < scripts/backup-dados-importacao.sql
```

**Tabelas criadas:**
- `usuarios` - Usuários do sistema
- `clientes` - Clientes IPTV
- `planos` - Planos disponíveis
- `servidores` - Servidores IPTV
- `configuracoes` - Configurações do sistema

## 📱 Acesso

### Painel Administrativo
```
URL: http://seu-dominio.com/admin
Usuário: admin
Senha: admin123@*
```

### Painel do Cliente
```
URL: http://seu-dominio.com/cliente
# Cada cliente tem seu próprio login
```

## 🛠️ Tecnologias

### Frontend
- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Radix UI** - Componentes acessíveis
- **Recharts** - Gráficos
- **Framer Motion** - Animações

### Backend
- **Next.js API Routes** - API REST
- **MySQL 8.0** - Banco de dados
- **bcryptjs** - Criptografia de senhas
- **jose** - JWT tokens
- **node-cron** - Agendamento de tarefas

### Integrações
- **Evolution API** - WhatsApp Business
- **Multer** - Upload de arquivos
- **Axios** - Cliente HTTP
- **QRCode** - Geração de QR codes

## 📊 Monitoramento

### Health Check
```bash
# Verificar status da aplicação
curl http://localhost:3000/api/health
```

### Logs
```bash
# Docker
docker logs dashboard-iptv -f

# Docker Compose
docker-compose logs -f dashboard-iptv
```

## 🔄 Atualizações

### Deploy Automático (Dokploy)
1. Faça commit das alterações
2. Push para o repositório
3. Dokploy fará redeploy automático

### Deploy Manual
```bash
# Docker Compose
docker-compose up -d --build

# Docker
docker build -t dashboard-iptv .
docker run -d --name dashboard-iptv -p 3000:3000 dashboard-iptv
```

## 📚 Documentação

- **[Deploy Dokploy](DEPLOY_DOKPLOY.md)** - Guia completo de deploy
- **[Docker Compose](docker-compose.yml)** - Setup local completo

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🆘 Suporte

- **Documentação:** [DEPLOY_DOKPLOY.md](DEPLOY_DOKPLOY.md)
- **Dokploy:** [Documentação Oficial](https://docs.dokploy.com/)

---

**⭐ Se este projeto foi útil, deixe uma estrela no GitHub!**

**🚀 Desenvolvido com ❤️ para a comunidade IPTV**