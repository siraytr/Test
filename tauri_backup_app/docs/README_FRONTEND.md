# Frontend (dev)

cd tauri-app
npm ci
npm run dev

The frontend currently points at relative `/api/*` paths; use a reverse proxy (or CORS) to connect to server at :8080.
