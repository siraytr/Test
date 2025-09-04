# Media Gallery App (Apple-like) — Fedora-ready

Kurze Übersicht, Installation & Betrieb siehe `README.md` und `scripts/` (Setup-Skripte).

Wesentliche Punkte:
- Node.js + Express backend
- React (Vite) frontend
- SQLite DB (lokal)
- Automount via udev+systemd (Label=MEDIA)
- Thumbnails via ffmpeg & libheif / ImageMagick
- session-basierte Auth, CSRF, rate-limit, Helmet/CSP
- Dark/Light Mode, deutsch UI

Siehe `scripts/setup-fedora.sh` für Installationsschritte (Option A: systemd) oder `docker/docker-compose.yml` (Option B).
