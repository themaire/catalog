const path = require('path');

function safeResolve(baseDir, targetPath) {
  const resolved = path.resolve(baseDir, targetPath);
  const relative = path.relative(baseDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid path');
  }
  return resolved;
}

module.exports = { safeResolve };
