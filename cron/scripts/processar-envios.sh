#!/bin/bash

# Script para processamento de envios em massa
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📨 Verificando campanhas de envio em massa..."

# Configurar variáveis
export TZ=America/Sao_Paulo
ENDPOINT="$APP_URL/api/cron/processar-envios"
HEADERS="x-cron-secret: $CRON_SECRET"

# Verificar se há campanhas ativas primeiro
STATUS_ENDPOINT="$APP_URL/api/envio-massa/estatisticas"
STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" "$STATUS_ENDPOINT")
STATUS_HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | head -n -1)

if [ "$STATUS_HTTP_CODE" = "200" ]; then
    # Verificar se há campanhas ativas
    CAMPANHAS_ATIVAS=$(echo "$STATUS_BODY" | grep -o '"enviando":[0-9]*' | cut -d':' -f2)
    
    if [ "$CAMPANHAS_ATIVAS" = "0" ] || [ -z "$CAMPANHAS_ATIVAS" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ℹ️ Nenhuma campanha ativa para processar"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏁 Processamento de envios finalizado"
        exit 0
    fi
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📊 Campanhas ativas encontradas: $CAMPANHAS_ATIVAS"
fi

# Executar processamento de envios
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📡 Chamando endpoint: $ENDPOINT"

RESPONSE=$(curl -s -w "\n%{http_code}" -H "$HEADERS" "$ENDPOINT")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Processamento de envios executado com sucesso"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Resposta: $BODY"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ Erro ao processar envios (HTTP: $HTTP_CODE)"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Resposta: $BODY"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏁 Processamento de envios finalizado" 