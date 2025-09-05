const sanitize = require('sanitize-filename');
module.exports = function safeName(name){
  // ensure no path traversal and safe characters
  const base = name.split('/').map(part => sanitize(part)).filter(Boolean).join('/');
  // fallback
  return base || 'file';
};
