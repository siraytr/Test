const express = require('express');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;
const UPLOAD_DIR = '/dev/sda1';

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(session({
  secret: 'ultra-sicheres-token-!@#$',
  resave: false,
  saveUninitialized: false,
}));

function isLoggedIn(req) {
  return req.session && req.session.authenticated;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'Schmorito' && password === '12389zerqw87zt21wqiuedgh721tp)P/A(IEUSFGD*-') {
    req.session.authenticated = true;
    res.redirect('/upload.html');
  } else {
    res.send('Login fehlgeschlagen');
  }
});

app.post('/upload', async (req, res) => {
  if (!isLoggedIn(req)) return res.status(401).send('Nicht autorisiert');

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('Keine Datei hochgeladen');
  }

  let uploadedFile = req.files.file;
  let uploadPath = path.join(__dirname, 'uploads', uploadedFile.name);

  await uploadedFile.mv(uploadPath);

  // Ist es ein Ordner (z. B. per .zip-Erkennung)?
  if (uploadedFile.mimetype === 'application/x-zip-compressed' || uploadedFile.name.endsWith('.zip')) {
    fs.copyFileSync(uploadPath, path.join(UPLOAD_DIR, uploadedFile.name));
  } else if (uploadedFile.mimetype === 'application/x-directory') {
    // Sollte nicht direkt auftreten (Browser können keine Ordner hochladen ohne Zip), aber falls du Drag&Drop nutzt:
    // handle folder here
  } else {
    // Alles andere in ZIP packen
    const zip = new AdmZip();
    zip.addLocalFile(uploadPath);
    const zipName = uploadedFile.name + '.zip';
    const zipPath = path.join(__dirname, 'uploads', zipName);
    zip.writeZip(zipPath);
    fs.copyFileSync(zipPath, path.join(UPLOAD_DIR, zipName));
  }

  res.send('Upload erfolgreich!');
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});