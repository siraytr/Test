import tkinter as tk
from tkinter import filedialog, messagebox
from tkinter.ttk import Progressbar
import ttkbootstrap as ttk
import threading
import os
from utils.zip_utils import zip_folder
from utils.auth_utils import login_and_upload

def start_client_gui():
    app = ttk.Window(themename="darkly")
    app.title("SecureZipTransfer - Client")
    app.geometry("500x400")

    username_var = tk.StringVar()
    password_var = tk.StringVar()
    selected_path = tk.StringVar()
    status_var = tk.StringVar(value="Bereit")

    def select_folder():
        path = filedialog.askdirectory()
        if path:
            selected_path.set(path)

    def start_transfer():
        username = username_var.get()
        password = password_var.get()
        folder = selected_path.get()
        if not all([username, password, folder]):
            messagebox.showerror("Fehler", "Bitte alle Felder ausfüllen!")
            return

        def task():
            try:
                status_var.set("Komprimiere Ordner...")
                zip_path = zip_folder(folder)
                status_var.set("Sende Datei...")
                success = login_and_upload(username, password, zip_path)
                os.remove(zip_path)
                if success:
                    status_var.set("Erfolgreich übertragen!")
                else:
                    status_var.set("Login fehlgeschlagen oder Serverfehler.")
            except Exception as e:
                status_var.set(f"Fehler: {e}")

        threading.Thread(target=task, daemon=True).start()

    ttk.Label(app, text="Benutzername:").pack(pady=(20, 5))
    ttk.Entry(app, textvariable=username_var).pack()

    ttk.Label(app, text="Passwort:").pack(pady=(10, 5))
    ttk.Entry(app, textvariable=password_var, show="*").pack()

    ttk.Button(app, text="Ordner auswählen", command=select_folder).pack(pady=15)
    ttk.Label(app, textvariable=selected_path, wraplength=400).pack()

    ttk.Button(app, text="Senden", bootstyle="success", command=start_transfer).pack(pady=15)

    ttk.Label(app, textvariable=status_var, bootstyle="info").pack(pady=10)

    app.mainloop()
