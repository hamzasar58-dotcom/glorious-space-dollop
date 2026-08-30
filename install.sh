#!/usr/bin/env bash
    set -euo pipefail

    if ! command -v node >/dev/null 2>&1; then
    echo "Node.js bulunamadı. Node.js 18 veya daha yeni bir sürüm kurun."
    exit 1
    fi

    if ! command -v npm >/dev/null 2>&1; then
    echo "npm bulunamadı. Node.js kurulumu ile birlikte npm de kurulmalıdır."
    exit 1
    fi

    echo "Bağımlılıklar kuruluyor..."
    npm install

    if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env dosyası oluşturuldu. İçine DISCORD_TOKEN değerini ekleyin."
    else
    echo ".env dosyası zaten mevcut, korunuyor."
    fi

    echo "Kurulum tamamlandı. Başlatmak için: npm start"
    