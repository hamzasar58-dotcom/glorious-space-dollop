#!/usr/bin/env bash
set -euo pipefail

if [ ! -d node_modules ]; then
  echo "Bağımlılıklar bulunamadı. Önce bash install.sh çalıştırılıyor..."
  bash install.sh
fi

if [ -z "${DISCORD_TOKEN:-}" ] && [ ! -f .env ]; then
  echo "DISCORD_TOKEN eksik. bash install.sh çalıştırın, sonra .env dosyasına tokenı ekleyin."
  exit 1
fi

npm start
