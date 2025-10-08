#!/bin/bash

restart_count=0

echo "🤖 Iniciando BOT..."

while :
do
    restart_count=$((restart_count + 1))
    echo "🔄 Reinicialização automática #$restart_count"
    echo "⏰ Auto reconexão ativada para prevenção de quedas.."
    echo "----------------------------------------"
    
    node index.js
    
    exit_code=$?
    
    echo "----------------------------------------"
    if [ $exit_code -eq 0 ]; then
        echo "✅ Aplicação encerrada normalmente"
    else
        echo "❌ Aplicação encerrada com erro (código: $exit_code)"
    fi
    echo "🔄 Reiniciando em 3 segundos..."
    echo "----------------------------------------"
    
    sleep 3
done