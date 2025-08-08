import tkinter as tk
import ttkbootstrap as ttk
import threading
from utils.auth_utils import validate_user
from utils.mount_utils import ensure_usb_mount
from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import json
import time

log_file_path = "/mnt/usb/logs/transfer.log"

def start_server_gui():
    app = ttk.Window(themename="darkly")
    app.title("SecureZipTransfer - Server")
    app.geometry("600x400")

    log_text = tk.Text(app, bg="black", fg="lime", wrap=tk.WORD)
    log_text.pack(expand=True, fill="both")

    def log(message):
        log_text.insert(tk.END, f"{message}\n")
        log_text.see(tk.END)
        with open(log_file_path, "a") as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} - {message}\n")

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path == "/upload":
                content_length = int(self.headers['Content-Length'])
                boundary = self.headers['Content-Type'].split("=")[-1].encode()
                body = self.rfile.read(content_length)
                parts = body.split(b"--" + boundary)

                data_part = next(p for p in parts if b'name="username"' in p)
                username = data_part.split(b'\r\n\r\n')[1].strip().decode()
                password_part = next(p for p in parts if b'name="password"' in p)
                password = password_part.split(b'\r\n\r\n')[1].strip().decode()

                if not validate_user(username, password):
                    self.send_response(403)
                    self.end_headers()
                    log(f"[FEHLER] Ungültiger Login: {username}")
                    return

                file_part = next(p for p in parts if b'name="file"' in p)
                file_data = file_part.split(b'\r\n\r\n')[1].rsplit(b'\r\n', 1)[0]

                try:
                    ensure_usb_mount()
                    os.makedirs("/mnt/usb/uploads", exist_ok=True)
                    os.makedirs("/mnt/usb/logs", exist_ok=True)
                    filename = f"/mnt/usb/uploads/{time.strftime('%Y-%m-%d')}_{username}.zip"
                    with open(filename, "wb") as f:
                        f.write(file_data)

                    self.send_response(200)
                    self.end_headers()
                    log(f"[OK] Datei empfangen von {username} -> {filename}")
                except Exception as e:
                    self.send_response(500)
                    self.end_headers()
                    log(f"[FEHLER] {e}")

    def run_server():
        ensure_usb_mount()
        os.makedirs("/mnt/usb/logs", exist_ok=True)
        httpd = HTTPServer(('', 3000), Handler)
        log("[INFO] Server gestartet auf Port 3000")
        httpd.serve_forever()

    threading.Thread(target=run_server, daemon=True).start()
    app.mainloop()
