# Tauri Desktop Backup & Gallery App - Scaffold

This repository is a scaffold for the requested project:
- Tauri-based desktop frontend (React + Vite + Tailwind)
- Rust Actix-web server with chunked upload endpoints
- PostgreSQL for metadata; uploads stored on `/mnt/usb/uploads`

This scaffold includes:
- Minimal server implementation with upload init/chunk/complete endpoints (stubs and core logic)
- Frontend skeleton (login/register/upload/gallery)
- Dockerfile and docker-compose example
- Tech design and CI stub

See `docs/TECH_DESIGN.md` for design decisions.

## How to use
1. Unpack the repo.
2. Start the server (see `infra/Dockerfile` or run locally with Rust).
3. Ensure `/mnt/usb/uploads` exists and is writable by the server user.
4. Run the Tauri frontend with `npm install` + `npm run dev` inside `tauri-app`.
5. Initialize the admin with `scripts/init_admin.sh`.

