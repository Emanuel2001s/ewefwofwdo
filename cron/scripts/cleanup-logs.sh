#!/bin/bash

# Script de limpeza de logs
echo "$(date '+%Y-%m-%d %H:%M:%S') - 🧹 Iniciando limpeza de logs..."

# Configurar variáveis
export TZ=America/Sao_Paulo
LOG_DIR="/app/logs"
RETENTION_DAYS=30

# Verificar se diretório existe
if [ ! -d "$LOG_DIR" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⚠️ Diretório de logs não encontrado: $LOG_DIR"
    exit 1
fi

# Contar arquivos antes da limpeza
TOTAL_FILES=$(find "$LOG_DIR" -name "*.log" -type f | wc -l)
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📊 Total de arquivos de log: $TOTAL_FILES"

# Limpar logs antigos (mais de 30 dias)
echo "$(date '+%Y-%m-%d %H:%M:%S') - 🗑️ Removendo logs com mais de $RETENTION_DAYS dias..."
DELETED_FILES=$(find "$LOG_DIR" -name "*.log" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Arquivos removidos: $DELETED_FILES"

# Truncar logs grandes (maiores que 50MB)
echo "$(date '+%Y-%m-%d %H:%M:%S') - ✂️ Truncando logs grandes..."
find "$LOG_DIR" -name "*.log" -type f -size +50M -exec truncate -s 0 {} \; -exec echo "$(date '+%Y-%m-%d %H:%M:%S') - 📝 Truncado: {}" \;

# Compactar logs da semana passada
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📦 Compactando logs antigos..."
find "$LOG_DIR" -name "*.log" -type f -mtime +7 -mtime -30 -exec gzip {} \; -exec echo "$(date '+%Y-%m-%d %H:%M:%S') - 📦 Compactado: {}.gz" \;

# Estatísticas finais
REMAINING_FILES=$(find "$LOG_DIR" -name "*.log" -type f | wc -l)
COMPRESSED_FILES=$(find "$LOG_DIR" -name "*.log.gz" -type f | wc -l)
DISK_USAGE=$(du -sh "$LOG_DIR" | cut -f1)

echo "$(date '+%Y-%m-%d %H:%M:%S') - 📊 Estatísticas finais:"
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📄 Logs ativos: $REMAINING_FILES"
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📦 Logs compactados: $COMPRESSED_FILES"
echo "$(date '+%Y-%m-%d %H:%M:%S') - 💾 Uso de disco: $DISK_USAGE"

echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏁 Limpeza de logs finalizada" 