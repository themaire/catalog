const express = require('express');
const { z } = require('zod');
const { requireRole } = require('../middleware/auth');
const {
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getDomain,
  updateDomain
} = require('../services/catalog');

const router = express.Router();
const categorySchema = z.object({ name: z.string().min(1).max(100), rightLevel: z.number().int().min(0).max(2) });
const domainSchema = z.object({ value: z.string().url().max(300) });

router.use(requireRole(2));

router.get('/categories', async (_req, res, next) => {
  try {
    const data = await listAdminCategories();
    res.json(data.map((c) => ({ id: c.lib_id, name: c.lib_nom, rightLevel: c.lib_free })));
  } catch (err) {
    next(err);
  }
});

router.post('/categories', async (req, res, next) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  try {
    const id = await createCategory(parsed.data.name.trim().toLowerCase(), parsed.data.rightLevel);
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
});

router.put('/categories/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = categorySchema.safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  try {
    await updateCategory(id, parsed.data.name.trim().toLowerCase(), parsed.data.rightLevel);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid category id' });

  try {
    await deleteCategory(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/domain', async (_req, res, next) => {
  try {
    const domain = await getDomain();
    if (!domain) return res.status(404).json({ error: 'Domain not found' });
    res.json({ id: domain.lib_id, value: domain.lib_nom });
  } catch (err) {
    next(err);
  }
});

router.put('/domain', async (req, res, next) => {
  const parsed = domainSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  try {
    await updateDomain(parsed.data.value);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
