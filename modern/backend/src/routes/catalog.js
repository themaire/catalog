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
  incrementDownloads
} = require('../services/catalog');
const { getModelFile, getModelDownload } = require('../services/files');

const router = express.Router();

// Le viewer 3D charge plusieurs fichiers par fiche : limite plus large que pour les téléchargements.
const extractLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

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
    const file = await getModelDownload(id, getRole(req));
    if (!file) return res.status(404).json({ error: 'Download file not found' });

    await incrementDownloads(id);
    res.download(file.absolute, file.fileName);
  } catch (err) {
    next(err);
  }
});

// Un fichier précis d'un modèle (extrait de l'archive si besoin, puis servi depuis le cache).
router.get('/models/:id/files/:fileId/extract', extractLimiter, async (req, res, next) => {
  const id = Number(req.params.id);
  const fileId = Number(req.params.fileId);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
    return res.status(400).json({ error: 'Invalid file request' });
  }

  try {
    const file = await getModelFile(id, fileId, getRole(req));
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.attachment(file.fileName);
    res.set('Content-Disposition', res.get('Content-Disposition').replace(/^attachment/, 'inline'));
    res.sendFile(file.absolute);
  } catch (err) {
    next(err);
  }
});

router.get('/models/:id/thumbnail/:file', downloadLimiter, async (req, res, next) => {
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
