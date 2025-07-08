#!/bin/bash

# Script de health check
echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏥 Executando health check..."

# Configurar variáveis
export TZ=America/Sao_Paulo
ENDPOINT="$APP_URL/api/health"

# Executar health check
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📡 Verificando saúde da aplicação: $ENDPOINT"

RESPONSE=$(curl -s -w "\n%{http_code}" "$ENDPOINT")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Aplicação saudável"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Resposta: $BODY"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ Aplicação com problemas (HTTP: $HTTP_CODE)"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Resposta: $BODY"
    
    # Verificar se precisa alertar
    if [ "$HTTP_CODE" != "200" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 🚨 ALERTA: Aplicação não está respondendo corretamente"
        # Aqui você pode adicionar lógica para enviar alertas via webhook, Slack, etc.
    fi
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏁 Health check finalizado" 