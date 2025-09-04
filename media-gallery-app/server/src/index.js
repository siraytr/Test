// Hauptserver
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const csurf = require('csurf');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const { PORT, SESSION_SECRET, MEDIA_CACHE } = require('./config');

const authRoutes = require('./auth/routes');
const apiRoutes = require('./api/routes');

const app = express();

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(morgan('combined', { stream: { write: (msg)=> logger.info(msg.trim()) } }));
app.use(bodyParser.json());
app.use(cookieParser());

// Sessions
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './data' }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 60*1000,
  max: 10,
  message: 'Zu viele Loginversuche, bitte später erneut versuchen.'
});
app.use('/api/login', loginLimiter);

// CSRF (für non-API-Json clients evtl. deaktivierbar, hier minimal)
app.use(csurf({ cookie: false }));

// Static frontend (built files)
app.use(express.static(path.join(__dirname, '..', 'web', 'dist')));

// API Routes
app.use(authRoutes);
app.use(apiRoutes);

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Fehlerseiten
app.use((err, req, res, next) => {
  logger.error({ msg: 'Unhandled Error', err: err.stack || err });
  if (err.code === 'EBADCSRFTOKEN') return res.status(403).send('CSRF Token ungültig');
  res.status(500).send('Serverfehler');
});

// 404
app.use((req,res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, '..', 'web', 'dist', 'index.html'));
  } else res.status(404).json({ error: 'Nicht gefunden' });
});

app.listen(PORT, () => {
  logger.info({msg: 'Server gestartet', port: PORT});
});
