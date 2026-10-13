// Synchronisation du dossier models/ avec la base (portage de catalog/2bdd.php + fonctions.php).
//
// Arborescence attendue : models/<catégorie>/<modèle> où <modèle> est un dossier ou une archive (zip/rar/7z).
// Comme en PHP, un dossier de modèle qui ne contient qu'un seul sous-dossier est « déballé » :
// le modèle devient ce sous-dossier (stl_path = models/<catégorie>/<dossier englobant>).
//
// Contrairement au PHP (qui ne revisitait jamais un modèle déjà connu), chaque passage resynchronise
// la liste des fichiers : ajouts, suppressions, et suppression des modèles disparus (ex-delBdd()).
// Les archives inchangées (même taille + mtime) ne sont pas relistées.

const fs = require('fs');
const path = require('path');
const { query } = require('../db');
const { thumbnailsRoot, extractRoot, scan: scanConfig } = require('../config');
const { getModelsRoot, displayPath } = require('./settings');
const { getExt, isArchive, isIgnoredName, listArchive, extractEntry } = require('../utils/archive');
const { MODELS_PREFIX } = require('../utils/models');

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif']);

let running = null;
let lastResult = null;
// Signature des archives déjà listées : chemin absolu -> "taille:mtime".
const archiveSignatures = new Map();

async function visibleEntries(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => !isIgnoredName(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Retourne [{ category, stlPath, name, absolute, archive }]
async function discoverModels(modelsRoot = getModelsRoot()) {
  const models = [];
  for (const cat of await visibleEntries(modelsRoot)) {
    if (!cat.isDirectory()) continue;
    const catDir = path.join(modelsRoot, cat.name);
    for (const entry of await visibleEntries(catDir)) {
      const absolute = path.join(catDir, entry.name);
      if (entry.isDirectory()) {
        const content = await visibleEntries(absolute);
        if (content.length === 1 && content[0].isDirectory()) {
          models.push({
            category: cat.name,
            stlPath: `${MODELS_PREFIX}/${cat.name}/${entry.name}`,
            name: content[0].name,
            absolute: path.join(absolute, content[0].name),
            archive: false
          });
        } else {
          models.push({ category: cat.name, stlPath: `${MODELS_PREFIX}/${cat.name}`, name: entry.name, absolute, archive: false });
        }
      } else if (entry.isFile() && isArchive(entry.name)) {
        models.push({ category: cat.name, stlPath: `${MODELS_PREFIX}/${cat.name}`, name: entry.name, absolute, archive: true });
      }
    }
  }
  return models;
}

// Liste récursive des fichiers d'un dossier de modèle : [{ path (relatif, avec /), size }]
async function walkDir(root, rel = '') {
  const files = [];
  for (const entry of await visibleEntries(path.join(root, rel))) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await walkDir(root, childRel)));
    } else if (entry.isFile()) {
      const stat = await fs.promises.stat(path.join(root, childRel));
      files.push({ path: childRel, size: stat.size });
    }
  }
  return files;
}

async function loadLibelles(lib_nom_id) {
  const rows = await query('SELECT lib_id, lib_nom FROM libelles WHERE lib_nom_id = ?', [lib_nom_id]);
  return new Map(rows.map((r) => [r.lib_nom.toLowerCase(), r.lib_id]));
}

async function ensureCategory(categories, name, stats) {
  const key = name.toLowerCase();
  if (!categories.has(key)) {
    const result = await query('INSERT INTO libelles (lib_nom, lib_nom_id, lib_free) VALUES (?, 1, ?)', [
      name,
      scanConfig.newCategoryLevel
    ]);
    categories.set(key, result.insertId);
    stats.categoriesCreated++;
  }
  return categories.get(key);
}

async function syncFiles(stlId, entries, extensions, stats) {
  const wanted = new Map();
  for (const entry of entries) {
    if (entry.path.split('/').some(isIgnoredName)) continue;
    const typeId = extensions.get(getExt(entry.path));
    if (!typeId) continue; // extension inconnue de la table libelles : ignorée, comme en PHP
    const slash = entry.path.lastIndexOf('/');
    const fiPath = slash >= 0 ? entry.path.slice(0, slash) : '';
    const fiNom = entry.path.slice(slash + 1);
    wanted.set(`${fiPath}/${fiNom}`, { fiPath, fiNom, typeId, size: entry.size });
  }

  const existing = await query('SELECT fi_id, fi_path, fi_nom FROM fichiers WHERE stl_id = ?', [stlId]);
  const existingKeys = new Set();
  for (const row of existing) {
    const key = `${row.fi_path}/${row.fi_nom}`;
    if (wanted.has(key)) {
      existingKeys.add(key);
    } else {
      await query('DELETE FROM fichiers WHERE fi_id = ?', [row.fi_id]);
      await fs.promises.rm(path.join(extractRoot, String(stlId), String(row.fi_id)), { force: true });
      stats.filesRemoved++;
    }
  }

  for (const [key, f] of wanted) {
    if (existingKeys.has(key)) continue;
    try {
      await query('INSERT INTO fichiers (stl_id, fi_nom, fi_path, lib_id_type, fi_taille) VALUES (?, ?, ?, ?, ?)', [
        stlId,
        f.fiNom,
        f.fiPath,
        f.typeId,
        f.size
      ]);
      stats.filesAdded++;
    } catch (err) {
      stats.errors.push(`fichier ${key} (stl ${stlId}): ${err.message}`);
    }
  }
}

// Vignette = première image trouvée (dossier : copie ; archive : extraction, ex-getStArchName()).
async function ensureThumbnail(model, stlId, currentThumbnail, entries) {
  if (currentThumbnail && fs.existsSync(path.join(thumbnailsRoot, currentThumbnail))) return;

  const image = entries.find((e) => IMAGE_EXTENSIONS.has(getExt(e.path)) && !e.path.split('/').some(isIgnoredName));
  if (!image) return;

  const thumbName = `${stlId}.${getExt(image.path)}`;
  const dest = path.join(thumbnailsRoot, thumbName);
  await fs.promises.mkdir(thumbnailsRoot, { recursive: true });
  if (model.archive) {
    await extractEntry(model.absolute, image.path, dest);
  } else {
    await fs.promises.copyFile(path.join(model.absolute, image.path), dest);
  }
  await query('UPDATE stl SET stl_thumbnail = ? WHERE stl_id = ?', [thumbName, stlId]);
}

async function removeModelArtifacts(row) {
  await fs.promises.rm(path.join(extractRoot, String(row.stl_id)), { recursive: true, force: true });
  await fs.promises.rm(path.join(extractRoot, `${row.stl_id}.zip`), { force: true });
  if (row.stl_thumbnail) await fs.promises.rm(path.join(thumbnailsRoot, row.stl_thumbnail), { force: true });
}

async function doScan() {
  const started = Date.now();
  const stats = {
    models: 0,
    modelsAdded: 0,
    modelsRemoved: 0,
    filesAdded: 0,
    filesRemoved: 0,
    categoriesCreated: 0,
    errors: []
  };

  const discovered = await discoverModels();
  // Garde-fou repris de 2bdd.php : un dossier models/ vide (montage absent...) ne doit pas vider la base.
  if (discovered.length === 0) {
    throw new Error(`Aucun modèle trouvé dans ${displayPath(getModelsRoot())} : scan annulé pour ne pas vider la base`);
  }

  const categories = await loadLibelles(1);
  const extensions = await loadLibelles(2);
  const rows = await query('SELECT stl_id, stl_nom, stl_path, stl_thumbnail FROM stl');
  const known = new Map(rows.map((r) => [`${r.stl_path}/${r.stl_nom}`, r]));
  const seen = new Set();

  for (const model of discovered) {
    const key = `${model.stlPath}/${model.name}`;
    seen.add(key);
    stats.models++;
    try {
      let row = known.get(key);
      if (!row) {
        const categoryId = await ensureCategory(categories, model.category, stats);
        const result = await query('INSERT INTO stl (stl_nom, stl_path, lib_id_categorie) VALUES (?, ?, ?)', [
          model.name,
          model.stlPath,
          categoryId
        ]);
        row = { stl_id: result.insertId, stl_thumbnail: null };
        stats.modelsAdded++;
      }

      let entries;
      if (model.archive) {
        const stat = await fs.promises.stat(model.absolute);
        const signature = `${stat.size}:${stat.mtimeMs}`;
        if (archiveSignatures.get(model.absolute) === signature && known.has(key)) continue;
        entries = await listArchive(model.absolute);
        archiveSignatures.set(model.absolute, signature);
      } else {
        entries = await walkDir(model.absolute);
      }

      await syncFiles(row.stl_id, entries, extensions, stats);
      await ensureThumbnail(model, row.stl_id, row.stl_thumbnail, entries);
    } catch (err) {
      archiveSignatures.delete(model.absolute);
      stats.errors.push(`modèle ${key}: ${err.message}`);
    }
  }

  for (const [key, row] of known) {
    if (seen.has(key)) continue;
    // ON DELETE CASCADE supprime aussi les lignes de `fichiers`.
    await query('DELETE FROM stl WHERE stl_id = ?', [row.stl_id]);
    await removeModelArtifacts(row);
    stats.modelsRemoved++;
  }

  return { ...stats, durationMs: Date.now() - started, finishedAt: new Date().toISOString() };
}

// Lance un scan ; si un scan est déjà en cours, retourne sa promesse au lieu d'en démarrer un second.
function runScan() {
  if (!running) {
    running = doScan()
      .then((result) => {
        lastResult = result;
        return result;
      })
      .catch((err) => {
        lastResult = { error: err.message, finishedAt: new Date().toISOString() };
        throw err;
      })
      .finally(() => {
        running = null;
      });
  }
  return running;
}

function getScanStatus() {
  return { running: !!running, lastResult };
}

module.exports = { runScan, getScanStatus, discoverModels };
