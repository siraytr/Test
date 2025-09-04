// Auth-Middleware, Session-Guard, RBAC
const express = require('express');
const db = require('../db');
const logger = require('../logger');

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next();
  // für API: 401, für Seiten: redirect
  if (req.accepts('html')) return res.redirect('/login');
  return res.status(401).json({ error: 'Nicht angemeldet' });
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Nicht angemeldet' });
  const row = db.prepare('SELECT role FROM users WHERE id = ?').get(req.session.userId);
  if (!row) return res.status(403).json({ error: 'Zugriff verweigert' });
  if (row.role !== 'admin') return res.status(403).json({ error: 'Admin-Rechte erforderlich' });
  return next();
}

module.exports = { requireLogin, requireAdmin };
