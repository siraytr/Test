# USB Gallery — Ready-to-run Project

## What this archive contains
- `server.js` — Node/Express backend that:
  - expects the USB to be mounted at `/mnt/usb` (configurable via env USB_MOUNT)
  - scans top-level folders as "collections"
  - generates thumbnails (ImageMagick / ffmpeg required)
  - simple auth for `Moritz` (password can be seeded via env MORITZ_PASSWORD)
  - serves the frontend build from `client_build/`
- `package.json` — backend dependencies & scripts
- `client/` — Vite + React + Tailwind frontend source
- `client/package.json`, `tailwind.config.cjs`, `postcss.config.cjs`, `vite.config.js`
- `client/src/` — React app (main.jsx, App.jsx, styles.css)

## Quick start (on Fedora)
1. Install system deps:
   ```bash
   sudo dnf install -y nodejs npm ffmpeg ImageMagick libheif sqlite sqlite-devel gcc-c++ make
   ```
2. Unzip archive on your server:
   ```bash
   unzip usb_gallery_project.zip -d ~/usb-gallery
   cd ~/usb-gallery
   ```
3. Backend install:
   ```bash
   npm install
   ```
4. Client install & build:
   ```bash
   cd client
   npm install
   npm run build
   cd ..
   ```
   This produces `client_build/` which the server serves.
5. Create a dedicated user to run the app (recommended):
   ```bash
   sudo useradd -r -s /sbin/nologin webapp
   # or run with your regular user for testing
   ```
6. Start server:
   ```bash
   # optionally set env vars:
   export MORITZ_PASSWORD='yourSecurePasswordHere'
   export USB_MOUNT='/mnt/usb'
   export SESSION_SECRET='change_me_to_a_long_random_value'

   node server.js
   ```
7. Open `http://your-server:3000` in a browser.

## Notes & security
- On first run, if MORITZ_PASSWORD is not set, the server prints a generated password for Moritz — change it ASAP.
- For production: run behind nginx with HTTPS, run Node under a non-root user, and limit sudoers rules if you enable web-mounting.
- Thumbnails are stored in `thumbnails/` in the project root.

## Adjustments
- To use web-triggered mounting you must configure sudoers for `udisksctl` (example in original plan).
- If using a specific device, set `USB_DEVICE=/dev/sdX1` when calling the `/api/mount` endpoint.
