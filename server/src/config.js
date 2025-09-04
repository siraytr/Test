// Konfiguration (DEUTSCH kommentiert)
const path = require('path');
require('dotenv').config();

module.exports = {
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'changeme',
  SESSION_SECRET: process.env.SESSION_SECRET || 'sessionsecret',
  MEDIA_ROOT: process.env.MEDIA_ROOT || '/mnt/media',
  MEDIA_CACHE: process.env.MEDIA_CACHE || '/var/cache/mediaapp/thumbs',
  DB_FILE: process.env.DB_FILE || '/var/lib/mediaapp/media.db',
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'production',
  MAX_PAGE_SIZE: 50
};
