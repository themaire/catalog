const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

// Payload du JWT valide de la requête, ou null.
function getTokenPayload(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice('Bearer '.length), jwtSecret);
  } catch {
    return null;
  }
}

function getRole(req) {
  return Number(getTokenPayload(req)?.role ?? 0);
}

function requireRole(minRole) {
  return (req, res, next) => {
    const role = getRole(req);
    if (role < minRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.userRole = role;
    next();
  };
}

module.exports = { getTokenPayload, getRole, requireRole };
