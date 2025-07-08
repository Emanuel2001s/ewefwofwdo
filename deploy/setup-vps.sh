#!/bin/bash

# Script de setup inicial da VPS para Dashboard IPTV
echo "🚀 Iniciando setup da VPS para Dashboard IPTV..."

# Definir variáveis
PROJECT_DIR="/opt/dashboard-iptv"
DOMAIN="dashboard.seudominio.com"
DB_NAME="dashboard_iptv"
DB_USER="dashboard_user"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script deve ser executado como root"
    exit 1
fi

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# Instalar dependências
echo "🔧 Instalando dependências..."
apt install -y \
    git \
    curl \
    wget \
    htop \
    unzip \
    vim \
    fail2ban \
    ufw \
    certbot

# Instalar Docker se não estiver instalado
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Instalar Docker Compose se não estiver instalado
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Verificar se Traefik está rodando
if ! docker ps | grep -q traefik; then
    echo "⚠️ Traefik não está rodando. Certifique-se de que está configurado corretamente."
    echo "Rede traefik-network deve existir para continuar."
    exit 1
fi

# Criar diretório do projeto
echo "📁 Criando diretório do projeto..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Clonar repositório (substitua pela sua URL)
echo "📥 Clonando repositório..."
read -p "Digite a URL do seu repositório GitHub: " REPO_URL
git clone $REPO_URL .

# Configurar permissões
echo "🔒 Configurando permissões..."
mkdir -p logs cron/logs mysql/data mysql/init mysql/conf
chmod 755 logs cron/logs
chmod 755 cron/scripts/*.sh

# Criar arquivo de ambiente
echo "⚙️ Criando arquivo de ambiente..."
cat > .env << EOF
# Configurações de produção - Dashboard IPTV
NODE_ENV=production
PORT=3000
DOMAIN=$DOMAIN

# Configurações do banco de dados
DB_HOST=mysql
DB_USER=$DB_USER
DB_PASSWORD=$(openssl rand -base64 32)
DB_NAME=$DB_NAME
DB_ROOT_PASSWORD=$(openssl rand -base64 32)

# Configurações de segurança
JWT_SECRET=$(openssl rand -base64 64)
CRON_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32 | cut -c1-32)

# Configurações da Evolution API
EVOLUTION_API_URL=https://evo.qpainel.com.br
EVOLUTION_API_KEY=sua_api_key_evolution
EOF

# Configurar firewall
echo "🛡️ Configurando firewall..."
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configurar fail2ban
echo "🔒 Configurando fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Configurar logrotate
echo "📄 Configurando logrotate..."
cat > /etc/logrotate.d/dashboard-iptv << EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        docker-compose -f $PROJECT_DIR/docker-compose.yml restart app
    endscript
}
EOF

# Configurar backup automático
echo "💾 Configurando backup automático..."
cat > /etc/cron.d/dashboard-iptv-backup << EOF
# Backup diário do banco de dados às 2:00 AM
0 2 * * * root /opt/dashboard-iptv/deploy/backup.sh >> /var/log/backup.log 2>&1
EOF

# Primeiro deploy
echo "🚀 Realizando primeiro deploy..."
docker-compose up -d

# Aguardar aplicação ficar disponível
echo "⏳ Aguardando aplicação ficar disponível..."
sleep 30

# Verificar se está funcionando
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Aplicação está funcionando!"
else
    echo "❌ Aplicação não está respondendo. Verifique os logs:"
    docker-compose logs
fi

# Informações finais
echo "🎉 Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o DNS para apontar $DOMAIN para este servidor"
echo "2. Configure as variáveis de ambiente no arquivo .env"
echo "3. Execute 'docker-compose restart' após configurar as variáveis"
echo "4. Configure os secrets do GitHub Actions:"
echo "   - SSH_PRIVATE_KEY: sua chave SSH privada"
echo "   - HOST: IP do servidor"
echo "   - USERNAME: usuário SSH"
echo "   - DOMAIN: $DOMAIN"
echo ""
echo "📂 Arquivos importantes:"
echo "- Projeto: $PROJECT_DIR"
echo "- Logs: $PROJECT_DIR/logs"
echo "- Backup: /etc/cron.d/dashboard-iptv-backup"
echo "- Ambiente: $PROJECT_DIR/.env"
echo ""
echo "🔧 Comandos úteis:"
echo "- Ver logs: docker-compose logs -f"
echo "- Restart: docker-compose restart"
echo "- Status: docker-compose ps"
echo "- Backup manual: $PROJECT_DIR/deploy/backup.sh" 