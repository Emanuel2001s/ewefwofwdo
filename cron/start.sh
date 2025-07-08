#!/bin/bash

# Script de inicialização do cron
echo "🚀 Iniciando serviço de cron para Dashboard IPTV..."

# Verificar se o diretório de logs existe
mkdir -p /app/logs

# Configurar timezone
export TZ=America/Sao_Paulo

# Verificar se as variáveis de ambiente estão configuradas
if [ -z "$APP_URL" ]; then
    echo "❌ Erro: APP_URL não configurado"
    exit 1
fi

if [ -z "$CRON_SECRET" ]; then
    echo "❌ Erro: CRON_SECRET não configurado"
    exit 1
fi

# Aguardar a aplicação ficar disponível
echo "⏳ Aguardando aplicação ficar disponível..."
until curl -s "$APP_URL/api/health" > /dev/null 2>&1; do
    sleep 5
done

echo "✅ Aplicação disponível em $APP_URL"

# Iniciar cron em background
echo "🕐 Iniciando cron daemon..."
crond -l 2 -f &

# Monitorar logs
echo "📊 Monitorando logs..."
tail -f /app/logs/*.log 