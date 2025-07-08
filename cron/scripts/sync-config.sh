#!/bin/bash

# Script para sincronizar configurações do sistema
echo "$(date '+%Y-%m-%d %H:%M:%S') - 🔄 Sincronizando configurações do sistema..."

# Configurar variáveis
export TZ=America/Sao_Paulo
CONFIG_FILE="/app/config/system.conf"
ENDPOINT="$APP_URL/api/configuracoes"

# Criar diretório de configurações se não existir
mkdir -p /app/config

# Buscar configurações do sistema
echo "$(date '+%Y-%m-%d %H:%M:%S') - 📡 Buscando configurações: $ENDPOINT"

RESPONSE=$(curl -s -w "\n%{http_code}" "$ENDPOINT")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ Configurações obtidas com sucesso"
    
    # Extrair configurações importantes
    NOTIFICACAO_HORARIO=$(echo "$BODY" | grep -o '"notificacao_horario":"[^"]*"' | cut -d'"' -f4)
    NOTIFICACAO_ATIVA=$(echo "$BODY" | grep -o '"notificacao_ativa":"[^"]*"' | cut -d'"' -f4)
    VENCIMENTO_DIAS=$(echo "$BODY" | grep -o '"vencimento_dias":"[^"]*"' | cut -d'"' -f4)
    
    # Usar valores padrão se não encontrar
    NOTIFICACAO_HORARIO=${NOTIFICACAO_HORARIO:-"09:00"}
    NOTIFICACAO_ATIVA=${NOTIFICACAO_ATIVA:-"true"}
    VENCIMENTO_DIAS=${VENCIMENTO_DIAS:-"1"}
    
    # Salvar configurações em arquivo
    cat > $CONFIG_FILE << EOF
# Configurações do sistema - Atualizado em $(date)
NOTIFICACAO_HORARIO="$NOTIFICACAO_HORARIO"
NOTIFICACAO_ATIVA="$NOTIFICACAO_ATIVA"
VENCIMENTO_DIAS="$VENCIMENTO_DIAS"
EOF
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Configurações salvas:"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 🕐 Horário notificação: $NOTIFICACAO_HORARIO"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 🔔 Notificação ativa: $NOTIFICACAO_ATIVA"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📅 Dias vencimento: $VENCIMENTO_DIAS"
    
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ Erro ao buscar configurações (HTTP: $HTTP_CODE)"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 📋 Resposta: $BODY"
    
    # Usar configurações padrão se não conseguir buscar
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ⚠️ Criando configurações padrão"
        cat > $CONFIG_FILE << EOF
# Configurações padrão do sistema
NOTIFICACAO_HORARIO="09:00"
NOTIFICACAO_ATIVA="true"
VENCIMENTO_DIAS="1"
EOF
    fi
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏁 Sincronização de configurações finalizada" 