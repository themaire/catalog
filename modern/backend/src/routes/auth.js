const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { jwtSecret } = require('../config');

const router = express.Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const users = [
  { username: process.env.MOD_USERNAME || 'moderate', password: process.env.MOD_PASSWORD || 'moderate', role: 1 },
  { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'admin', role: 2 }
];

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const user = users.find((u) => u.username === parsed.data.username && u.password === parsed.data.password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ sub: user.username, role: user.role }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token, role: user.role });
});

module.exports = router;
