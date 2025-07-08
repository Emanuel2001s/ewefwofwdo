#!/bin/bash

# Script para atualização de clientes expirados
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📅 Verificando atualização de clientes expirados..."

# Configurar variáveis
export TZ=America/Sao_Paulo
CONFIG_FILE="/app/config/system.conf"
ENDPOINT="$APP_URL/api/cron/update-expired"
HEADERS="x-cron-secret: $CRON_SECRET"

# Carregar configurações do sistema
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⚠️ Arquivo de configuração não encontrado, usando padrões"
    NOTIFICACAO_HORARIO="09:00"
fi

# Obter hora atual
HORA_ATUAL=$(date +%H:%M)
HORA_CONFIG=$(echo "$NOTIFICACAO_HORARIO" | cut -d':' -f1)
MINUTO_CONFIG=$(echo "$NOTIFICACAO_HORARIO" | cut -d':' -f2)
HORA_ATUAL_NUM=$(date +%H)
MINUTO_ATUAL_NUM=$(date +%M)

# Verificar se é o horário configurado (executa no mesmo horário das notificações)
if [ "$HORA_ATUAL_NUM" -eq "$HORA_CONFIG" ] && [ "$MINUTO_ATUAL_NUM" -ge "$MINUTO_CONFIG" ] && [ "$MINUTO_ATUAL_NUM" -lt $((MINUTO_CONFIG + 10)) ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⏰ Horário configurado ($NOTIFICACAO_HORARIO) - Executando atualização"
    
    # Executar atualização de clientes expirados
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📡 Chamando endpoint: $ENDPOINT"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "$HEADERS" "$ENDPOINT")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Atualização de clientes expirados executada com sucesso"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Resposta: $BODY"
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ Erro ao atualizar clientes expirados (HTTP: $HTTP_CODE)"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Resposta: $BODY"
    fi
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ⏳ Fora do horário configurado ($NOTIFICACAO_HORARIO). Atual: $HORA_ATUAL"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏁 Atualização de clientes expirados finalizada" 