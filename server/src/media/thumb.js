// Thumbnail/Poster-Generator (ruft extern tools: heif-convert/convert/ffmpeg)
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { MEDIA_CACHE } = require('../config');
const logger = require('../logger');

if (!fs.existsSync(MEDIA_CACHE)) fs.mkdirSync(MEDIA_CACHE, { recursive: true });

function safeFilename(s) {
  return s.replace(/[^a-zA-Z0-9\-_\.]*/g, '_');
}

function thumbPathFor(mediaPath) {
  const hash = Buffer.from(mediaPath).toString('base64').replace(/=/g,'');
  return path.join(MEDIA_CACHE, `${safeFilename(hash)}.jpg`);
}

function ensureImageThumb(srcPath) {
  return new Promise((resolve, reject) => {
    const out = thumbPathFor(srcPath);
    if (fs.existsSync(out)) return resolve(out);
    // HEIC -> convert via heif-convert or ImageMagick
    execFile('magick', ['convert', srcPath + '[0]', '-thumbnail', '600x600>', out], (err) => {
      if (!err) { logger.info({msg:'Thumb erzeugt via magick', src: srcPath}); return resolve(out); }
      // fallback: try heif-convert then convert
      execFile('heif-convert', [srcPath, out], (e2) => {
        if (!e2) return resolve(out);
        logger.error({msg:'Thumbnail Fehler', err: err, e2});
        return reject(new Error('Thumb generation failed'));
      });
    });
  });
}

function ensureVideoPoster(srcPath) {
  return new Promise((resolve, reject) => {
    const out = thumbPathFor(srcPath);
    if (fs.existsSync(out)) return resolve(out);
    // ffmpeg: frame bei 1s extrahieren
    execFile('ffmpeg', ['-y', '-ss', '00:00:01', '-i', srcPath, '-frames:v', '1', '-q:v', '2', out], (err) => {
      if (err) {
        logger.error({msg:'ffmpeg Poster Fehler', err});
        return reject(err);
      }
      resolve(out);
    });
  });
}

module.exports = { thumbPathFor, ensureImageThumb, ensureVideoPoster };
