// Haupt-API: Album-Liste, Album-View, Thumbnail-Endpoint
const express = require('express');
const db = require('../db');
const path = require('path');
const { requireLogin, requireAdmin } = require('../auth/middleware');
const { MEDIA_ROOT, MAX_PAGE_SIZE } = require('../config');
const { ensureImageThumb, ensureVideoPoster, thumbPathFor } = require('../media/thumb');
const allowed = require('../media/allowed');
const fs = require('fs');
const router = express.Router();

// Helper: get top-level directories (Hauptalben)
router.get('/api/albums', requireLogin, (req, res) => {
  // Liste Top-Level-Ordner unter MEDIA_ROOT
  const dirs = fs.existsSync(MEDIA_ROOT) ? fs.readdirSync(MEDIA_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name) : [];
  const albums = dirs.map(name => {
    const full = path.join(MEDIA_ROOT, name);
    // stats: count & size
    let count = 0; let size = 0;
    function walk(p) {
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        const fullp = path.join(p, e.name);
        if (e.isDirectory()) walk(fullp);
        else {
          const ext = path.extname(e.name).toLowerCase();
          if (allowed.IMAGE.includes(ext) || allowed.VIDEO.includes(ext)) {
            count++;
            size += fs.statSync(fullp).size;
          }
        }
      }
    }
    try { walk(full); } catch(e) {}
    return { title: name, path: `/media/${encodeURIComponent(name)}`, count, size };
  });
  res.json(albums);
});

// Paginated album contents
router.get('/api/album/:name', requireLogin, (req, res) => {
  const name = req.params.name;
  const page = Math.max(1, parseInt(req.query.page||'1',10));
  const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(req.query.pageSize||'25',10));
  const dir = path.join(MEDIA_ROOT, name);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Album nicht gefunden' });

  // Gather files (flat)
  const items = [];
  function walk(p) {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const fullp = path.join(p, e.name);
      if (e.isDirectory()) walk(fullp);
      else {
        const ext = path.extname(e.name).toLowerCase();
        if (allowed.IMAGE.includes(ext) || allowed.VIDEO.includes(ext)) {
          items.push({
            path: fullp,
            filename: e.name,
            mime: ext.replace('.',''),
            size: fs.statSync(fullp).size
          });
        }
      }
    }
  }
  walk(dir);
  // sort by filename for determinism
  items.sort((a,b)=> a.filename.localeCompare(b.filename, 'de'));
  const start = (page-1)*pageSize;
  const pageItems = items.slice(start, start+pageSize).map(it => ({
    filename: it.filename,
    url: `/media-file?path=${encodeURIComponent(it.path)}`,
    thumb: `/api/thumbnail?path=${encodeURIComponent(it.path)}`
  }));
  res.json({ total: items.length, page, pageSize, items: pageItems });
});

// Serve raw media with streaming & range support
router.get('/media-file', requireLogin, (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(400).send('Pfad fehlt');
  // Pfad-Whitelisting: ensure under MEDIA_ROOT
  const resolved = path.resolve(p);
  if (!resolved.startsWith(path.resolve(MEDIA_ROOT))) return res.status(403).send('Ungültiger Pfad');
  const stat = fs.statSync(resolved);
  const range = req.headers.range;
  const mimeType = require('mime-types').lookup(resolved) || 'application/octet-stream';
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/,'').split('-');
    const start = parseInt(startStr,10);
    const end = endStr ? parseInt(endStr,10) : stat.size -1;
    const chunkSize = (end - start) + 1;
    const stream = fs.createReadStream(resolved, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(resolved).pipe(res);
  }
});

// Thumbnail endpoint
router.get('/api/thumbnail', requireLogin, async (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(400).send('Pfad fehlt');
  const resolved = path.resolve(p);
  if (!resolved.startsWith(path.resolve(MEDIA_ROOT))) return res.status(403).send('Ungültiger Pfad');

  const ext = path.extname(resolved).toLowerCase();
  try {
    let thumb;
    if (['.mp4','.mov','.m4v'].includes(ext)) {
      thumb = await ensureVideoPoster(resolved);
    } else {
      thumb = await ensureImageThumb(resolved);
    }
    // send thumbnail
    res.sendFile(thumb);
  } catch (e) {
    res.status(500).json({ error: 'Thumb Fehler' });
  }
});

module.exports = router;
