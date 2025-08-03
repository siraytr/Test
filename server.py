const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const port = 3000;

// Speicherort konfigurieren (z.B. Ordner uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Dateiname mit Zeitstempel umbenennen
    const ext = path.extname(file.originalname);
    cb(null, 'backup_' + Date.now() + ext);
  }
});

const upload = multer({ storage });

// Upload-Ordner erstellen, falls nicht existiert
const fs = require('fs');
if (!fs.existsSync('uploads')){
    fs.mkdirSync('uploads');
}

// POST /upload zum Hochladen der Datei
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Keine Datei hochgeladen.');
  }
  console.log(`Datei ${req.file.originalname} hochgeladen und gespeichert als ${req.file.filename}`);
  res.send('Datei erfolgreich hochgeladen.');
});

app.listen(port, () => {
  console.log(`Upload Server läuft auf http://localhost:${port}`);
});
