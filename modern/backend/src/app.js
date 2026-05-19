const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
