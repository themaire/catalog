const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function getRole(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return 0;
  try {
    const token = auth.slice('Bearer '.length);
    const payload = jwt.verify(token, jwtSecret);
    return Number(payload.role ?? 0);
  } catch {
    return 0;
  }
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

module.exports = { getRole, requireRole };
