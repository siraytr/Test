#!/usr/bin/env bash
# Erstellt eine .env aus .env.example und ersetzt Platzhalter
set -e
if [ -f .env ]; then
  echo ".env existiert bereits. Wenn du neu anfangen willst: rm .env"
  exit 1
fi
cp .env.example .env
echo "Generiere sichere SESSION_SECRET..."
NODE_SESSION_SECRET=$(head -c 32 /dev/urandom | base64)
sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=${NODE_SESSION_SECRET}|" .env
echo ".env erzeugt. Bitte ADMIN_PASSWORD in .env setzen."
