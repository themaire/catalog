const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { jwtSecret } = require('../config');
const { query } = require('../db');
const { getTokenPayload } = require('../middleware/auth');

const router = express.Router();

// Anti-bruteforce sur la connexion et le changement de mot de passe.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez dans quelques minutes' }
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  try {
    const rows = await query(
      'SELECT id, username, password_hash, role FROM users WHERE username = ? AND active = 1 LIMIT 1',
      [parsed.data.username]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordOk = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!passwordOk) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: user.username, role: user.role }, jwtSecret, { expiresIn: '8h' });
    return res.json({ token, role: user.role });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200)
});

// Changement de son propre mot de passe (utilisateur connecté, ancien mot de passe requis).
router.put('/password', authLimiter, async (req, res) => {
  const payload = getTokenPayload(req);
  if (!payload?.sub) return res.status(401).json({ error: 'Not authenticated' });

  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' });

  try {
    const rows = await query('SELECT id, password_hash FROM users WHERE username = ? AND active = 1 LIMIT 1', [
      payload.sub
    ]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.password_hash))) {
      return res.status(403).json({ error: 'Mot de passe actuel incorrect' });
    }
    const hash = await bcrypt.hash(parsed.data.newPassword, 12);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    return res.status(204).send();
  } catch (err) {
    console.error('[auth/password]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
