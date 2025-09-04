#!/usr/bin/env bash
# Führt initialen Media-Scan via server/src/media/indexer.js
set -euo pipefail

# Annahme: node ist installiert und server Abhängigkeiten sind installiert
pushd server
node src/indexer-runner.js
popd
echo "Initialer Indexing-Run abgeschlossen."
