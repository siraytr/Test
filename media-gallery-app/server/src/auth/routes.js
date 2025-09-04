// Auth-Routen: /login, /logout, /suggest-register
const express = require('express');
const argon2 = require('argon2');
const uuid = require('uuid');
const db = require('../db');
const router = express.Router();
const { requireAdmin } = require('./middleware');

// Login GET (serve login page static in frontend) - API POST handles credentials
router.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Benutzername & Passwort erforderlich' });

  const user = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Ungültige Zugangsdaten' });

  try {
    const verified = await argon2.verify(user.password_hash, password);
    if (!verified) return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session Fehler' });
      req.session.userId = user.id;
      res.json({ ok: true });
    });
  } catch (e) {
    return res.status(500).json({ error: 'Serverfehler' });
  }
});

router.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Registrierungsvorschlag (kein Auto-Account)
router.post('/api/suggest-user', (req, res) => {
  const { name, email, desired_username } = req.body || {};
  if (!name || !email || !desired_username) return res.status(400).json({ error: 'Alle Felder erforderlich' });
  db.prepare('INSERT INTO pending_users (name, email, desired_username) VALUES (?, ?, ?)').run(name, email, desired_username);
  res.json({ ok: true });
});

// Admin: Liste pending users
router.get('/api/admin/pending', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM pending_users ORDER BY created_at DESC').all();
  res.json(rows);
});

// Admin: approve or reject
router.post('/api/admin/pending/:id/approve', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id,10);
  const row = db.prepare('SELECT * FROM pending_users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  // Default password random — Admin soll Nutzer danach kontaktieren und Passwort zurücksetzen.
  const tempPassword = uuid.v4().slice(0,8);
  const hash = await argon2.hash(tempPassword);
  db.prepare('INSERT INTO users (username, name, email, password_hash, role) VALUES (?,?,?,?,?)')
    .run(row.desired_username, row.name, row.email, hash, 'user');
  db.prepare('DELETE FROM pending_users WHERE id = ?').run(id);
  // Hinweis: tatsächlich Mailversand nicht implementiert
  res.json({ ok: true, tempPassword });
});

router.post('/api/admin/pending/:id/reject', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id,10);
  db.prepare('DELETE FROM pending_users WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
