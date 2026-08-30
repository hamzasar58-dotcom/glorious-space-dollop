#!/usr/bin/env bash
    set -euo pipefail

    if [ ! -d node_modules ]; then
    echo "Bağımlılıklar bulunamadı, kurulum başlatılıyor..."
    bash ./install.sh
    fi

    if [ -z "$DISCORD_TOKEN" ] && [ ! -f .env ]; then
    echo "DISCORD_TOKEN eksik. Önce bash ./install.sh çalıştırıp .env dosyasını doldurun."
    exit 1
    fi

    npm start
    