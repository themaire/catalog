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
const fs = require('fs');
const path = require('path');
const { runScan, getScanStatus, discoverModels } = require('../services/scan');
const { getModelsRoot, getBrowseRoots, resolveBrowsable, displayPath, setModelsRoot } = require('../services/settings');
const { isIgnoredName } = require('../utils/archive');

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
    const id = await createCategory(parsed.data.name.trim(), parsed.data.rightLevel);
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
    await updateCategory(id, parsed.data.name.trim(), parsed.data.rightLevel);
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

router.get('/scan', (_req, res) => {
  res.json(getScanStatus());
});

// Déclenche un scan immédiat du dossier models/ et attend son résultat.
router.post('/scan', async (_req, res, next) => {
  try {
    res.json(await runScan());
  } catch (err) {
    next(err);
  }
});

// --- Dossier des modèles (assistant de premier lancement + administration) ---

function libraryInfo() {
  const current = getModelsRoot();
  return {
    current: { path: current, display: displayPath(current) },
    roots: getBrowseRoots().map((r) => ({ label: r.label, path: r.path, display: r.hostLabel }))
  };
}

router.get('/library', (_req, res) => {
  res.json(libraryInfo());
});

// Sous-dossiers d'un dossier + aperçu de ce que le scan y trouverait (catégories / modèles).
router.get('/library/browse', async (req, res, next) => {
  const target = resolveBrowsable(String(req.query.path ?? ''));
  if (!target) return res.status(400).json({ error: 'Dossier non autorisé' });

  try {
    const entries = await fs.promises.readdir(target.path, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && !isIgnoredName(e.name))
      .map((e) => ({ name: e.name, path: path.join(target.path, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const models = await discoverModels(target.path).catch(() => []);
    const byCategory = new Map();
    for (const m of models) byCategory.set(m.category, (byCategory.get(m.category) ?? 0) + 1);

    const rootReal = fs.realpathSync(target.root.path);
    res.json({
      path: target.path,
      display: displayPath(target.path),
      parent: target.path === rootReal ? null : path.dirname(target.path),
      dirs,
      preview: {
        models: models.length,
        categories: [...byCategory].map(([name, count]) => ({ name, models: count }))
      }
    });
  } catch (err) {
    if (err.code === 'EACCES') return res.status(403).json({ error: 'Accès refusé à ce dossier (droits Unix)' });
    next(err);
  }
});

const librarySchema = z.object({ path: z.string().min(1) });

// Change le dossier des modèles puis rescanne. Les modèles absents du nouveau dossier sont retirés du catalogue.
router.put('/library', async (req, res, next) => {
  const parsed = librarySchema.safeParse(req.body);
  const target = parsed.success ? resolveBrowsable(parsed.data.path) : null;
  if (!target || !fs.statSync(target.path).isDirectory()) return res.status(400).json({ error: 'Dossier non autorisé' });

  try {
    await setModelsRoot(target.path);
    // Un scan déjà en cours porte sur l'ancien dossier : on l'attend, puis on rescanne.
    await runScan().catch(() => {});
    let scan;
    try {
      scan = await runScan();
    } catch (err) {
      scan = { error: err.message };
    }
    res.json({ ...libraryInfo(), scan });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
