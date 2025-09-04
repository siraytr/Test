// DB-Initialisierung (SQLite via better-sqlite3)
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { DB_FILE } = require('./config');
const logger = require('./logger');

const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_FILE);

// Schema initialisieren
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  name TEXT,
  email TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pending_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  desired_username TEXT,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER,
  title TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS album_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  album_id INTEGER,
  media_path TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS media_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE,
  filename TEXT,
  mime TEXT,
  size INTEGER,
  mtime INTEGER,
  dir TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

logger.info({msg: 'DB initialisiert', dbFile: DB_FILE});
module.exports = db;
