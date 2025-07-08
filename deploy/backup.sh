#!/bin/bash

# Script de backup automático - Dashboard IPTV
echo "$(date '+%Y-%m-%d %H:%M:%S') - 💾 Iniciando backup..."

# Configurar variáveis
PROJECT_DIR="/opt/dashboard-iptv"
BACKUP_DIR="/opt/backups/dashboard-iptv"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="dashboard-iptv-mysql"
RETENTION_DAYS=30

# Carregar variáveis de ambiente
cd $PROJECT_DIR
source .env

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Função para log
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Verificar se o container MySQL está rodando
if ! docker ps | grep -q $CONTAINER_NAME; then
    log "❌ Container MySQL não está rodando"
    exit 1
fi

# Backup do banco de dados
log "📀 Fazendo backup do banco de dados..."
BACKUP_FILE="$BACKUP_DIR/database_backup_$DATE.sql"

docker exec $CONTAINER_NAME mysqldump \
    -u root \
    -p$DB_ROOT_PASSWORD \
    --single-transaction \
    --routines \
    --triggers \
    --all-databases > $BACKUP_FILE

if [ $? -eq 0 ]; then
    log "✅ Backup do banco criado: $BACKUP_FILE"
else
    log "❌ Erro ao criar backup do banco"
    exit 1
fi

# Compactar backup
log "📦 Compactando backup..."
gzip $BACKUP_FILE
COMPRESSED_FILE="$BACKUP_FILE.gz"

if [ -f "$COMPRESSED_FILE" ]; then
    log "✅ Backup compactado: $COMPRESSED_FILE"
    BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    log "📊 Tamanho do backup: $BACKUP_SIZE"
else
    log "❌ Erro ao compactar backup"
    exit 1
fi

# Backup dos uploads (se existirem)
if [ -d "$PROJECT_DIR/public/uploads" ]; then
    log "📁 Fazendo backup dos uploads..."
    UPLOADS_BACKUP="$BACKUP_DIR/uploads_backup_$DATE.tar.gz"
    tar -czf $UPLOADS_BACKUP -C $PROJECT_DIR/public uploads/
    
    if [ $? -eq 0 ]; then
        log "✅ Backup dos uploads criado: $UPLOADS_BACKUP"
    else
        log "⚠️ Erro ao fazer backup dos uploads"
    fi
fi

# Backup das configurações
log "⚙️ Fazendo backup das configurações..."
CONFIG_BACKUP="$BACKUP_DIR/config_backup_$DATE.tar.gz"
tar -czf $CONFIG_BACKUP -C $PROJECT_DIR \
    .env \
    docker-compose.yml \
    mysql/conf/ \
    2>/dev/null

if [ $? -eq 0 ]; then
    log "✅ Backup das configurações criado: $CONFIG_BACKUP"
else
    log "⚠️ Erro ao fazer backup das configurações"
fi

# Limpeza de backups antigos
log "🧹 Limpando backups antigos (mais de $RETENTION_DAYS dias)..."
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
DELETED_COUNT=$(find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS | wc -l)
log "🗑️ Backups antigos removidos: $DELETED_COUNT"

# Estatísticas finais
TOTAL_BACKUPS=$(ls -1 $BACKUP_DIR/*.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)

log "📊 Estatísticas do backup:"
log "📄 Total de backups: $TOTAL_BACKUPS"
log "💾 Espaço total usado: $TOTAL_SIZE"
log "✅ Backup concluído com sucesso!"

# Opcional: Enviar backup para storage externo
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ] && [ -n "$AWS_BUCKET" ]; then
    log "☁️ Enviando backup para AWS S3..."
    aws s3 cp $COMPRESSED_FILE s3://$AWS_BUCKET/backups/dashboard-iptv/
    if [ $? -eq 0 ]; then
        log "✅ Backup enviado para S3"
    else
        log "❌ Erro ao enviar backup para S3"
    fi
fi

# Notificação de sucesso (opcional)
if [ -n "$WEBHOOK_URL" ]; then
    curl -X POST -H "Content-Type: application/json" \
        -d "{\"text\":\"✅ Backup do Dashboard IPTV realizado com sucesso! Tamanho: $BACKUP_SIZE\"}" \
        $WEBHOOK_URL
fi

log "🏁 Script de backup finalizado" 