const path = require('path');

function safeResolve(baseDir, targetPath) {
  const resolved = path.resolve(baseDir, targetPath);
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Invalid path');
  }
  return resolved;
}

module.exports = { safeResolve };
