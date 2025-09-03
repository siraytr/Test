// USB Gallery Backend (simplified)
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const DB_PATH = path.resolve(__dirname, 'data.db');
const USB_MOUNT_POINT = process.env.USB_MOUNT || '/mnt/usb';
const THUMBS_DIR = path.resolve(__dirname, 'thumbnails');

fs.ensureDirSync(THUMBS_DIR);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT)`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS albums (id TEXT PRIMARY KEY, name TEXT, created_at INTEGER)`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS album_items (album_id TEXT, filepath TEXT, PRIMARY KEY (album_id, filepath))`).run();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

async function ensureMoritz() {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get('Moritz');
  if (!row) {
    const securePassword = process.env.MORITZ_PASSWORD || crypto.randomBytes(12).toString('base64');
    const hash = await bcrypt.hash(securePassword, 12);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, 'Moritz', hash);
    console.log('Created user Moritz with password (change ASAP):', securePassword);
  }
}
ensureMoritz().catch(console.error);

function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.username === 'Moritz') return next();
  res.status(401).json({ error: 'not_authorized' });
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!row) return res.status(401).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid' });
  req.session.user = { id: row.id, username: row.username };
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post('/api/mount', requireAuth, (req, res) => {
  const dev = req.body.dev;
  if(!dev) return res.status(400).json({error:'missing_device'});
  exec(`sudo /usr/bin/udisksctl mount -b ${dev}`, (err, stdout, stderr) => {
    if (err) {
      console.error('mount error', err, stderr);
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ ok: true, out: stdout });
  });
});

const EXT = /\.(jpe?g|heic|mp4|mov|png)$/i;
function isMedia(file) { return EXT.test(file); }

async function ensureThumbnail(fullPath) {
  const stat = await fs.stat(fullPath);
  const id = crypto.createHash('sha1').update(fullPath + stat.mtimeMs).digest('hex');
  const out = path.join(THUMBS_DIR, `${id}.jpg`);
  if (await fs.pathExists(out)) return `/thumbnails/${id}.jpg`;

  const ext = path.extname(fullPath).toLowerCase();
  if (ext === '.mp4' || ext === '.mov') {
    await new Promise((resolve, reject) => {
      const cmd = `ffmpeg -y -i ${JSON.stringify(fullPath)} -ss 00:00:01.000 -vframes 1 ${JSON.stringify(out)}`;
      exec(cmd, (err, so, se) => err ? reject(se || err) : resolve());
    });
    return `/thumbnails/${id}.jpg`;
  } else if (ext === '.heic') {
    await new Promise((resolve, reject) => {
      const cmd = `magick ${JSON.stringify(fullPath)} -resize 1024x1024\> ${JSON.stringify(out)}`;
      exec(cmd, (err, so, se) => err ? reject(se || err) : resolve());
    });
    return `/thumbnails/${id}.jpg`;
  } else {
    await new Promise((resolve, reject) => {
      const cmd = `magick ${JSON.stringify(fullPath)} -auto-orient -resize 1024x1024\> ${JSON.stringify(out)}`;
      exec(cmd, (err, so, se) => err ? reject(se || err) : resolve());
    });
    return `/thumbnails/${id}.jpg`;
  }
}

app.get('/api/scan', requireAuth, async (req, res) => {
  try {
    const root = USB_MOUNT_POINT;
    if (!await fs.pathExists(root)) return res.status(400).json({ error: 'usb_not_mounted', root });
    const entries = await fs.readdir(root);
    const collections = [];
    for (const name of entries.sort()) {
      const full = path.join(root, name);
      const s = await fs.stat(full);
      if (!s.isDirectory()) continue;
      const files = (await fs.readdir(full))
        .filter(f => isMedia(f))
        .map(f => path.join(full, f));
      if (files.length === 0) continue;
      const items = [];
      for (const f of files) {
        try {
          const thumb = await ensureThumbnail(f);
          items.push({ path: f, thumb });
        } catch (err) {
          console.error('thumb error', f, err);
        }
      }
      collections.push({ name, path: full, items });
    }
    res.json({ ok: true, collections });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/albums', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM albums ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/api/albums', requireAuth, (req, res) => {
  const name = req.body.name && req.body.name.trim();
  if (!name) return res.status(400).json({ error: 'missing_name' });
  const id = uuidv4();
  db.prepare('INSERT INTO albums (id, name, created_at) VALUES (?, ?, ?)').run(id, name, Date.now());
  res.json({ ok: true, id, name });
});

app.post('/api/albums/:id/add', requireAuth, (req, res) => {
  const id = req.params.id;
  const filepath = req.body.filepath;
  if (!filepath) return res.status(400).json({ error: 'missing_filepath' });
  db.prepare('INSERT OR IGNORE INTO album_items (album_id, filepath) VALUES (?, ?)').run(id, filepath);
  res.json({ ok: true });
});

app.get('/api/albums/:id/items', requireAuth, (req, res) => {
  const id = req.params.id;
  const items = db.prepare('SELECT filepath FROM album_items WHERE album_id = ?').all(id).map(r => r.filepath);
  (async () => {
    const response = [];
    for (const f of items) {
      try {
        if (await fs.pathExists(f)) {
          const thumb = await ensureThumbnail(f);
          response.push({ filepath: f, thumb });
        }
      } catch (e) { console.error(e); }
    }
    res.json({ items: response });
  })();
});

app.use('/thumbnails', express.static(THUMBS_DIR));
app.use('/static', express.static(path.join(__dirname, 'client_build')));

app.get('*', (req, res) => {
  const index = path.join(__dirname, 'client_build', 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(404).send('Build not found. Please build the client (cd client && npm install && npm run build).');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT} (USB mount: ${USB_MOUNT_POINT})`));
