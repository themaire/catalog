const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { jwtSecret } = require('../config');
const { query } = require('../db');

const router = express.Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

router.post('/login', async (req, res) => {
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

module.exports = router;
