
use actix_web::{web, App, HttpServer, Responder, HttpResponse, HttpRequest};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::fs;
use sha2::{Digest, Sha256};
use futures::StreamExt;
use tokio::io::AsyncReadExt;

#[derive(Deserialize)]
struct InitUpload {
    filename: String,
    size: u64,
    checksum: Option<String>,
}

#[derive(Serialize)]
struct InitResp {
    upload_id: String,
    chunk_size: u64,
}

async fn init_upload(body: web::Json<InitUpload>) -> impl Responder {
    // create upload record in DB (stubbed) and return upload id + chunk size
    let upload_id = Uuid::new_v4().to_string();
    // Normally persist to DB
    HttpResponse::Ok().json(InitResp { upload_id, chunk_size: 8 * 1024 * 1024 })
}

#[derive(Deserialize)]
struct ChunkQuery {
    index: u64,
}

async fn upload_chunk(req: HttpRequest, path: web::Path<(String,)>, q: web::Query<ChunkQuery>, mut payload: web::Payload) -> actix_web::Result<HttpResponse> {
    // Save chunk stream to temp file: /tmp/uploads/<upload_id>.<index>.part
    let upload_id = &path.0;
    let index = q.index;
    let tmp_dir = std::env::var("TMP_UPLOAD_DIR").unwrap_or_else(|_| "/tmp/tauri_uploads".to_string());
    let _ = fs::create_dir_all(&tmp_dir).await;
    let part_path = format!("{}/{}.{}.part", tmp_dir, upload_id, index);
    let mut f = fs::File::create(&part_path).await?;
    while let Some(chunk) = payload.next().await {
        let data = chunk?;
        use tokio::io::AsyncWriteExt;
        f.write_all(&data).await?;
    }
    Ok(HttpResponse::Ok().body("OK"))
}

#[derive(Deserialize)]
struct CompleteReq {
    total_chunks: u64,
    checksum: Option<String>,
    username: Option<String>,
    compress: Option<bool>,
}

async fn complete_upload(path: web::Path<(String,)>, info: web::Json<CompleteReq>) -> impl Responder {
    let upload_id = &path.0;
    let tmp_dir = std::env::var("TMP_UPLOAD_DIR").unwrap_or_else(|_| "/tmp/tauri_uploads".to_string());
    let target_dir = std::env::var("UPLOADS_DIR").unwrap_or_else(|_| "/mnt/usb/uploads".to_string());
    let out_temp = format!("{}/{}.assembled.tmp", tmp_dir, upload_id);
    let mut out = fs::File::create(&out_temp).await.expect("create temp out");
    use tokio::io::AsyncWriteExt;
    for i in 0..info.total_chunks {
        let part = format!("{}/{}.{}.part", tmp_dir, upload_id, i);
        if let Ok(mut p) = fs::File::open(&part).await {
            tokio::io::copy(&mut p, &mut out).await.expect("copy part");
        } else {
            return HttpResponse::BadRequest().body(format!("missing chunk {}", i));
        }
    }
    // compute checksum
    drop(out);
    let mut file = fs::File::open(&out_temp).await.expect("open assembled");
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 8 * 1024];
    loop {
        let n = file.read(&mut buf).await.expect("read");
        if n == 0 { break; }
        hasher.update(&buf[..n]);
    }
    let got = hex::encode(hasher.finalize());
    if let Some(expected) = &info.checksum {
        if &got != expected {
            return HttpResponse::BadRequest().body("checksum mismatch");
        }
    }
    // move to final location (ensure dirs)
    let date = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let user = info.username.clone().unwrap_or_else(|| "unknown".to_string());
    let final_dir = format!("{}/{}/{}", target_dir, date, user);
    let _ = fs::create_dir_all(&final_dir).await;
    let final_path = format!("{}/{}.backup", final_dir, upload_id);
    let _ = fs::rename(&out_temp, &final_path).await;
    HttpResponse::Ok().json(serde_json::json!({"id": upload_id, "path": final_path, "checksum": got }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Ensure TMP dir
    let tmp_dir = std::env::var("TMP_UPLOAD_DIR").unwrap_or_else(|_| "/tmp/tauri_uploads".to_string());
    std::fs::create_dir_all(&tmp_dir).ok();
    println!("Starting server at 127.0.0.1:8080");
    HttpServer::new(|| {
        App::new()
            .route("/api/upload/init", web::post().to(init_upload))
            .route("/api/upload/{upload_id}/chunk", web::post().to(upload_chunk))
            .route("/api/upload/{upload_id}/complete", web::post().to(complete_upload))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
