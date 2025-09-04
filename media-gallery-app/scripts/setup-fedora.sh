#!/usr/bin/env bash
# Setup-Skript für Fedora (Option A: ohne Docker)
# Root ausführen oder sudo
set -euo pipefail

echo "Installiere Basis-Pakete..."
dnf install -y nodejs npm ffmpeg ImageMagick libheif-tools sqlite wget git policycoreutils-python-utils

echo "Installiere yarn (optional)..."
npm install -g pnpm@latest || true

echo "Erstelle Systemuser 'mediaapp'..."
useradd --system --create-home --shell /sbin/nologin mediaapp || true
mkdir -p /var/lib/mediaapp /var/cache/mediaapp /mnt/media
chown -R mediaapp:mediaapp /var/lib/mediaapp /var/cache/mediaapp /mnt/media

echo "Firewall-Regeln (HTTP/HTTPS/PORT):"
echo "Bitte PORT in .env prüfen. Beispiel: PORT=4000"
# firewall-cmd --permanent --add-service=http
# firewall-cmd --permanent --add-service=https
# firewall-cmd --reload

echo "Wichtig: SELinux-Kontext für Mountpunkt und Cache setzen (restorecon):"
semanage fcontext -a -t httpd_sys_content_t "/var/cache/mediaapp(/.*)?" || true
semanage fcontext -a -t httpd_sys_content_t "/var/lib/mediaapp(/.*)?" || true
restorecon -Rv /var/cache/mediaapp || true
restorecon -Rv /var/lib/mediaapp || true

echo "Installationsskript fertig. Setze nun .env (scripts/create-env.sh), konfiguriere systemd Units (systemd/) und udev rule (udev/)."
