FROM rust:1.72-slim

RUN apt-get update && apt-get install -y libssl-dev pkg-config ffmpeg libheif-dev --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server /app
RUN cargo build --release

ENV UPLOADS_DIR=/mnt/usb/uploads
ENV TMP_UPLOAD_DIR=/tmp/tauri_uploads

CMD ["/app/target/release/tauri_backup_server"]
