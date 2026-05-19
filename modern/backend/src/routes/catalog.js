const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { getRole } = require('../middleware/auth');
const { thumbnailsRoot } = require('../config');
const { safeResolve } = require('../utils/path');
const {
  listCategories,
  listModelsByCategory,
  getModel,
  incrementDownloads,
  getModelDownloadPath
} = require('../services/catalog');

const router = express.Router();

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

router.get('/categories', async (req, res, next) => {
  try {
    const role = getRole(req);
    const data = await listCategories(role);
    res.json(data.map((c) => ({ id: c.lib_id, name: c.lib_nom, rightLevel: c.lib_free })));
  } catch (err) {
    next(err);
  }
});

router.get('/models', async (req, res, next) => {
  const schema = z.object({ category: z.string().min(1) });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'category query param is required' });

  try {
    const role = getRole(req);
    const models = await listModelsByCategory(parsed.data.category, role);
    res.json(models);
  } catch (err) {
    next(err);
  }
});

router.get('/models/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid model id' });

  try {
    const role = getRole(req);
    const model = await getModel(id, role);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json(model);
  } catch (err) {
    next(err);
  }
});

router.get('/models/:id/download', downloadLimiter, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid model id' });

  try {
    const file = await getModelDownloadPath(id);
    if (!file) return res.status(404).json({ error: 'Download file not found' });

    await incrementDownloads(id);
    res.download(file.absolute, file.fileName);
  } catch (err) {
    next(err);
  }
});

router.get('/models/:id/thumbnail/:file', async (req, res, next) => {
  const id = Number(req.params.id);
  const fileName = req.params.file;
  if (!Number.isInteger(id) || id <= 0 || !fileName) {
    return res.status(400).json({ error: 'Invalid thumbnail request' });
  }

  try {
    const filePath = safeResolve(thumbnailsRoot, fileName);
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
