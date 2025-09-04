// Indexer: scannt MEDIA_ROOT rekursiv, speichert Pfade in DB
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { MEDIA_ROOT } = require('../config');
const logger = require('../logger');
const allowed = require('./allowed');

function walkDir(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkDir(full, cb);
    } else if (e.isFile()) {
      cb(full);
    }
  }
}

function isAllowed(file) {
  const ext = path.extname(file).toLowerCase();
  return allowed.IMAGE.includes(ext) || allowed.VIDEO.includes(ext);
}

function indexAll() {
  logger.info({msg:'Starte Media-Indexing', mediaRoot: MEDIA_ROOT});
  if (!fs.existsSync(MEDIA_ROOT)) {
    logger.warn({msg:'MEDIA_ROOT existiert nicht', mediaRoot: MEDIA_ROOT});
    return;
  }
  const insert = db.prepare('INSERT OR IGNORE INTO media_index (path, filename, mime, size, mtime, dir) VALUES (?,?,?,?,?,?)');
  const statStmt = db.prepare('UPDATE media_index SET size = ?, mtime = ? WHERE path = ?');
  walkDir(MEDIA_ROOT, (file) => {
    try {
      if (!isAllowed(file)) return;
      const st = fs.statSync(file);
      const mime = path.extname(file).slice(1).toLowerCase();
      insert.run(file, path.basename(file), mime, st.size, st.mtimeMs, path.dirname(file));
      statStmt.run(st.size, st.mtimeMs, file);
    } catch (e) {
      logger.error({msg:'Index Fehler bei Datei', file, err: e});
    }
  });
  logger.info({msg:'Indexing fertig'});
}

module.exports = { indexAll };
