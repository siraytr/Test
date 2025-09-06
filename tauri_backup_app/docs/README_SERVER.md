# Server - Quick start

1. Ensure Rust toolchain installed.
2. Set environment variables:
   - DATABASE_URL=postgres://user:pass@localhost:5432/tauri
   - UPLOADS_DIR=/mnt/usb/uploads
   - TMP_UPLOAD_DIR=/tmp/tauri_uploads
3. Create upload dir: `sudo mkdir -p /mnt/usb/uploads && sudo chown $(whoami) /mnt/usb/uploads`
4. Build and run:
   ```
   cd server
   cargo run --release
   ```
5. Initialize admin: `scripts/init_admin.sh`
