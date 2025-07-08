#!/bin/bash

# Script para notificações WhatsApp de vencimento
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📱 Verificando notificações WhatsApp..."

# Configurar variáveis
export TZ=America/Sao_Paulo
CONFIG_FILE="/app/config/system.conf"
ENDPOINT="$APP_URL/api/cron/whatsapp-notifications"
HEADERS="Content-Type: application/json"

# Carregar configurações do sistema
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⚠️ Arquivo de configuração não encontrado, usando padrões"
    NOTIFICACAO_HORARIO="09:00"
    NOTIFICACAO_ATIVA="true"
fi

# Verificar se notificações estão ativas
if [ "$NOTIFICACAO_ATIVA" != "true" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⏸️ Notificações desabilitadas nas configurações"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏁 Notificações WhatsApp finalizadas"
    exit 0
fi

# Obter hora atual
HORA_ATUAL=$(date +%H:%M)
HORA_CONFIG=$(echo "$NOTIFICACAO_HORARIO" | cut -d':' -f1)
MINUTO_CONFIG=$(echo "$NOTIFICACAO_HORARIO" | cut -d':' -f2)
HORA_ATUAL_NUM=$(date +%H)
MINUTO_ATUAL_NUM=$(date +%M)

# Verificar se é o horário configurado (com margem de 1 minuto)
if [ "$HORA_ATUAL_NUM" -eq "$HORA_CONFIG" ] && [ "$MINUTO_ATUAL_NUM" -ge "$MINUTO_CONFIG" ] && [ "$MINUTO_ATUAL_NUM" -lt $((MINUTO_CONFIG + 10)) ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⏰ Horário configurado ($NOTIFICACAO_HORARIO) - Executando notificações"
    
    # Executar notificações WhatsApp
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📡 Chamando endpoint: $ENDPOINT"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST -H "$HEADERS" -d '{}' "$ENDPOINT")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Notificações WhatsApp executadas com sucesso"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Resposta: $BODY"
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ Erro ao executar notificações WhatsApp (HTTP: $HTTP_CODE)"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Resposta: $BODY"
    fi
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⏳ Fora do horário configurado ($NOTIFICACAO_HORARIO). Atual: $HORA_ATUAL"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏁 Notificações WhatsApp finalizadas" 