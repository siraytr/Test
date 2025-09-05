// server.js - production-oriented
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');
const sharp = require('sharp');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const xss = require('xss-clean');
const sanitizeFilename = require('./src/utils/sanitize-filename');
const http = require('http');
const socketIo = require('socket.io');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'nexus' },
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' }});

// config dirs
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const GALLERIES_DIR = process.env.GALLERIES_DIR || path.join(__dirname, 'public', 'galleries');
const TMP_DIR = process.env.TMP_DIR || path.join(__dirname, 'tmp_uploads');

[UPLOAD_DIR, GALLERIES_DIR, TMP_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// db pool
if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL is required. See .env.example');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// basic security middleware
app.use(helmet());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(xss());

// rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});
app.use(limiter);

// session with Postgres store
app.use(session({
  store: new PgStore({ pool }),
  secret: process.env.SESSION_SECRET || 'please-set-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// static assets
app.use(express.static(path.join(__dirname, 'src', 'web')));
app.use('/galleries', express.static(GALLERIES_DIR));

// simple logging
app.use((req,res,next)=>{ logger.info(`${req.method} ${req.path}`); next(); });

// helper: query
const db = {
  query: (...args) => pool.query(...args)
};

// ensure migrations run before starting in production (you should run migrate.js externally)
// create admin if env provided
async function ensureAdmin(){
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;
  const email = process.env.ADMIN_EMAIL;
  const res = await db.query('SELECT id FROM users WHERE email=$1', [email]);
  if (res.rowCount === 0) {
    const id = uuidv4();
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await db.query('INSERT INTO users (id,email,password,is_admin) VALUES ($1,$2,$3,$4)', [id, email, hash, true]);
    logger.info('Admin user created for ' + email);
  } else {
    logger.info('Admin already exists for ' + email);
  }
}

// auth helpers
function requireAuth(req,res,next){
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}
async function requireAdmin(req,res,next){
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const r = await db.query('SELECT is_admin FROM users WHERE id=$1', [req.session.userId]);
  if (r.rowCount === 0 || !r.rows[0].is_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// auth endpoints
app.post('/api/login', async (req,res)=>{
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const r = await db.query('SELECT id, password, is_admin FROM users WHERE email=$1', [email]);
  if (r.rowCount === 0) return res.status(400).json({ error: 'Invalid credentials' });
  const user = r.rows[0];
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  req.session.userId = user.id;
  res.json({ ok: true, isAdmin: !!user.is_admin });
});

app.post('/api/logout', (req,res)=>{
  req.session.destroy(err => {
    if (err) logger.error('session destroy error', err);
    res.json({ ok: true });
  });
});

// account request
app.post('/api/request-account', async (req,res) => {
  const { email, name, message } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const id = uuidv4();
  await db.query('INSERT INTO requests (id,email,name,message) VALUES ($1,$2,$3,$4)', [id, email, name || null, message || null]);
  res.json({ ok: true });
});

// admin endpoints
app.get('/api/admin/requests', requireAdmin, async (req,res) => {
  const r = await db.query('SELECT id,email,name,message,created_at FROM requests ORDER BY created_at DESC');
  res.json(r.rows);
});

app.post('/api/admin/approve', requireAdmin, async (req,res) => {
  const { requestId } = req.body;
  const r = await db.query('SELECT * FROM requests WHERE id=$1', [requestId]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
  const reqRow = r.rows[0];
  const passwordPlain = uuidv4().slice(0,10);
  const hash = await bcrypt.hash(passwordPlain, 12);
  const id = uuidv4();
  await db.query('INSERT INTO users (id,email,password,is_admin) VALUES ($1,$2,$3,$4)', [id, reqRow.email, hash, false]);
  await db.query('DELETE FROM requests WHERE id=$1', [requestId]);
  // In production: send email to user with password (not shown). For now return password (admin must deliver securely)
  res.json({ ok: true, email: reqRow.email, password: passwordPlain });
});

app.post('/api/admin/change-user-password', requireAdmin, async (req,res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(newPassword, 12);
  await db.query('UPDATE users SET password=$1 WHERE id=$2', [hash, userId]);
  res.json({ ok: true });
});

app.post('/api/admin/change-admin-password', requireAdmin, async (req,res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'Missing password' });
  const hash = await bcrypt.hash(newPassword, 12);
  await db.query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.session.userId]);
  res.json({ ok: true });
});

app.get('/api/admin/users', requireAdmin, async (req,res) => {
  const r = await db.query('SELECT id,email,is_admin,created_at FROM users ORDER BY created_at DESC');
  res.json(r.rows);
});

// file upload (folder -> zip)
const upload = multer({ dest: TMP_DIR, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB per file limit

app.post('/api/upload-folder', requireAuth, upload.array('files'), async (req,res) => {
  const files = req.files || [];
  const albumName = (req.body.albumName || `album-${Date.now()}`).slice(0,200);
  const zipId = uuidv4();
  const zipPath = path.join(UPLOAD_DIR, `${zipId}.zip`);
  const out = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  out.on('close', () => { /* handled below */ });
  archive.on('error', err => {
    logger.error('zip error', err);
    return res.status(500).json({ error: 'zip error' });
  });

  archive.pipe(out);
  // add files preserving originalname (which should carry relative path)
  for (const f of files) {
    const safeName = sanitizeFilename(f.originalname);
    try {
      archive.append(fs.createReadStream(f.path), { name: safeName });
    } catch (e) {
      logger.warn('append failed', e);
    }
  }
  await archive.finalize();

  // wait for stream finish using a Promise
  await new Promise((resolve) => out.on('close', resolve));

  // persist album record
  await db.query('INSERT INTO albums (id,name,zip_path) VALUES ($1,$2,$3)', [zipId, albumName, zipPath]);

  // extract images to gallery dir
  const albumDir = path.join(GALLERIES_DIR, zipId);
  if (!fs.existsSync(albumDir)) fs.mkdirSync(albumDir, { recursive: true });
  const thumbsDir = path.join(albumDir, 'thumbs');
  if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

  const extractStream = fs.createReadStream(zipPath).pipe(unzipper.Parse());
  extractStream.on('entry', async (entry) => {
    const fileName = entry.path;
    const ext = path.extname(fileName).toLowerCase();
    if (['.jpg','.jpeg','.png','.webp','.gif'].includes(ext)) {
      const base = path.basename(fileName);
      const outPath = path.join(albumDir, base);
      entry.pipe(fs.createWriteStream(outPath)).on('finish', async () => {
        try {
          await sharp(outPath).resize(400, 400, { fit: 'cover' }).toFile(path.join(thumbsDir, base));
        } catch (e) {
          logger.warn('thumb error', e);
        }
      });
    } else {
      entry.autodrain();
    }
  });

  extractStream.on('close', () => {
    io.emit('upload-complete', { albumId: zipId, albumName });
  });

  // cleanup tmp upload files
  for (const f of files) {
    try { fs.unlinkSync(f.path); } catch(e){ }
  }

  res.json({ ok: true, albumId: zipId, albumName });
});

// list albums
app.get('/api/albums', async (req,res) => {
  const r = await db.query('SELECT id,name,created_at FROM albums ORDER BY created_at DESC');
  res.json(r.rows);
});

app.get('/api/albums/:id/photos', async (req,res) => {
  const albumDir = path.join(GALLERIES_DIR, req.params.id);
  if (!fs.existsSync(albumDir)) return res.json([]);
  const files = fs.readdirSync(albumDir).filter(f => f !== 'thumbs');
  res.json(files);
});

// socket events
io.on('connection', (socket) => {
  logger.info('socket connected: ' + socket.id);
});

// start server
const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await ensureAdmin();
    server.listen(PORT, () => logger.info(`Server listening on ${PORT}`));
  } catch (e) {
    logger.error('start error', e);
    process.exit(1);
  }
})();
