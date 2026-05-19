const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { jwtSecret } = require('../config');

const router = express.Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

function configuredUsers() {
  const users = [];
  if (process.env.MOD_USERNAME && process.env.MOD_PASSWORD_HASH) {
    users.push({ username: process.env.MOD_USERNAME, passwordHash: process.env.MOD_PASSWORD_HASH, role: 1 });
  }
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH) {
    users.push({ username: process.env.ADMIN_USERNAME, passwordHash: process.env.ADMIN_PASSWORD_HASH, role: 2 });
  }
  return users;
}

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const users = configuredUsers();
  if (!users.length) {
    return res.status(503).json({ error: 'Authentication is not configured on server' });
  }

  const user = users.find((u) => u.username === parsed.data.username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordOk) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ sub: user.username, role: user.role }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token, role: user.role });
});

module.exports = router;
