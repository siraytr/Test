#!/usr/bin/env bash
# erzeugt tar.gz des Projekts (ohne node_modules)
set -euo pipefail
OUT="media-gallery-app-$(date +%Y%m%d_%H%M).tar.gz"
tar --exclude='**/node_modules' --exclude='.git' -czf "$OUT" .
echo "Archiv erstellt: $OUT"
