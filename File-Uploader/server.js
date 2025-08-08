const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000; // Freigeben für Webzugriff (z. B. in UFW oder Firewall)
const MOUNT_PATH = '/mnt/external';
const DEVICE = '/dev/sda1';

// === 1. Mount-Skript automatisch ausführen ===
function mountDrive() {
  if (!fs.existsSync(MOUNT_PATH)) {
    fs.mkdirSync(MOUNT_PATH, { recursive: true });
  }

  const mountProcess = spawn('mount', [DEVICE, MOUNT_PATH]);

  mountProcess.stdout.on('data', data => {
    console.log(`[Mount] ${data}`);
  });

  mountProcess.stderr.on('data', data => {
    console.error(`[Mount Fehler] ${data}`);
  });

  mountProcess.on('exit', code => {
    if (code === 0) {
      console.log(`[Mount] Erfolgreich: ${DEVICE} → ${MOUNT_PATH}`);
    } else {
      console.error(`[Mount] Fehlercode ${code}. Laufwerk evtl. bereits gemountet.`);
    }
  });
}

// Mount bei Start
mountDrive();

// === 2. Webserver vorbereiten ===
app.use(express.static('public'));

// === 3. Datei-Uploader ===
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  const tempPath = req.file.path;
  const originalName = req.file.originalname;
  const targetPath = path.join(MOUNT_PATH, originalName);

  console.log(`[Upload] ZIP empfangen: ${originalName}`);

  const readStream = fs.createReadStream(tempPath);
  const writeStream = fs.createWriteStream(targetPath);

  let totalSize = req.file.size;
  let uploadedSize = 0;

  readStream.on('data', chunk => {
    uploadedSize += chunk.length;
    const percent = ((uploadedSize / totalSize) * 100).toFixed(1);
    process.stdout.write(`\r[Server] Upload-Fortschritt: ${percent}%`);
  });

  readStream.pipe(writeStream);

  writeStream.on('finish', () => {
    fs.unlinkSync(tempPath);
    console.log(`\n[Server] Upload abgeschlossen: ${targetPath}`);
    res.sendStatus(200);
  });

  writeStream.on('error', err => {
    console.error('\n[Server] Fehler beim Speichern:', err);
    res.sendStatus(500);
  });
});

// === 4. Server starten ===
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
