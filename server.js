// file: server.js

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

// ==== CONFIG ====
const USERS = {
  'Test': '23891rzwe3278weo',
  'admin': 'm175#3901'
};

let currentStoragePath = '/tmp/uploads';

// ==== SESSION ====
app.use(session({
  secret: 'fileuploadsite',
  resave: false,
  saveUninitialized: false
}));

// ==== MIDDLEWARE ====
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

function authMiddleware(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

function isAdmin(req) {
  return req.session.user === 'admin';
}

// ==== STORAGE SETUP ====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdirSync(currentStoragePath, { recursive: true });
    cb(null, currentStoragePath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// ==== ROUTES ====
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (USERS[username] && USERS[username] === password) {
    req.session.user = username;
    return res.redirect('/');
  }
  return res.send('Login fehlgeschlagen.');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  return res.redirect('/');
});

app.get('/files', authMiddleware, (req, res) => {
  fs.readdir(currentStoragePath, (err, files) => {
    if (err) return res.json([]);
    res.json(files);
  });
});

app.get('/admin/disks', authMiddleware, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Forbidden');

  const mounts = fs.readFileSync('/proc/mounts', 'utf-8')
    .split('\n')
    .map(line => line.split(' '))
    .filter(parts => parts[1].startsWith('/mnt') || parts[1].startsWith('/media'))
    .map(parts => parts[1]);

  res.json(mounts);
});

app.post('/admin/setdisk', authMiddleware, (req, res) => {
  if (!isAdmin(req)) return res.status(403).send('Forbidden');

  const disk = req.body.disk;
  if (fs.existsSync(disk)) {
    currentStoragePath = disk;
    return res.redirect('/');
  }
  return res.status(400).send('Ungültiger Pfad');
});

app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));