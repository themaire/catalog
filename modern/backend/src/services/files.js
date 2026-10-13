const fs = require('fs');
const path = require('path');
const { query } = require('../db');
const { extractRoot } = require('../config');
const { safeResolve } = require('../utils/path');
const { getExt, isArchive, extractEntry, zipDirectory } = require('../utils/archive');
const { modelAbsolutePath } = require('../utils/models');

// Extractions/zips en cours, pour qu'une même ressource ne soit produite qu'une fois en parallèle.
const inFlight = new Map();

function once(key, producer) {
  if (!inFlight.has(key)) {
    inFlight.set(key, producer().finally(() => inFlight.delete(key)));
  }
  return inFlight.get(key);
}

async function isFresh(cachePath, sourceMtimeMs) {
  try {
    const stat = await fs.promises.stat(cachePath);
    return stat.mtimeMs >= sourceMtimeMs;
  } catch {
    return false;
  }
}

async function latestMtime(dir) {
  let latest = (await fs.promises.stat(dir)).mtimeMs;
  for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    latest = Math.max(latest, entry.isDirectory() ? await latestMtime(child) : (await fs.promises.stat(child)).mtimeMs);
  }
  return latest;
}

// Retourne { absolute, fileName } du fichier demandé, en l'extrayant de l'archive si besoin (cache disque).
// null si le fichier n'existe pas ou si la catégorie n'est pas accessible avec ce rôle.
async function getModelFile(modelId, fileId, accessLevel = 0) {
  const rows = await query(
    `SELECT fi.fi_id, fi.fi_nom, fi.fi_path, stl.stl_id, stl.stl_nom, stl.stl_path
     FROM fichiers fi
     INNER JOIN stl ON stl.stl_id = fi.stl_id
     INNER JOIN libelles lib ON lib.lib_id = stl.lib_id_categorie AND lib.lib_nom_id = 1
     WHERE fi.fi_id = ? AND stl.stl_id = ? AND lib.lib_free <= ? LIMIT 1`,
    [fileId, modelId, accessLevel]
  );
  if (!rows.length) return null;
  const row = rows[0];
  const modelPath = modelAbsolutePath(row.stl_path, row.stl_nom);
  const entryPath = row.fi_path ? `${row.fi_path}/${row.fi_nom}` : row.fi_nom;

  if (!isArchive(row.stl_nom)) {
    const absolute = safeResolve(modelPath, entryPath);
    return fs.existsSync(absolute) ? { absolute, fileName: row.fi_nom } : null;
  }

  if (!fs.existsSync(modelPath)) return null;
  const ext = getExt(row.fi_nom);
  const cachePath = path.join(extractRoot, String(row.stl_id), `${row.fi_id}${ext ? `.${ext}` : ''}`);
  const archiveStat = await fs.promises.stat(modelPath);
  if (!(await isFresh(cachePath, archiveStat.mtimeMs))) {
    await once(cachePath, () => extractEntry(modelPath, entryPath, cachePath));
  }
  return { absolute: cachePath, fileName: row.fi_nom };
}

// Fichier à télécharger pour un modèle : l'archive telle quelle, ou un zip (en cache) du dossier.
async function getModelDownload(modelId, accessLevel = 0) {
  const rows = await query(
    `SELECT stl.stl_id, stl.stl_nom, stl.stl_path
     FROM stl INNER JOIN libelles lib ON lib.lib_id = stl.lib_id_categorie AND lib.lib_nom_id = 1
     WHERE stl.stl_id = ? AND lib.lib_free <= ? LIMIT 1`,
    [modelId, accessLevel]
  );
  if (!rows.length) return null;
  const absolute = modelAbsolutePath(rows[0].stl_path, rows[0].stl_nom);
  if (!fs.existsSync(absolute)) return null;

  const stat = await fs.promises.stat(absolute);
  if (!stat.isDirectory()) return { absolute, fileName: rows[0].stl_nom };

  const zipPath = path.join(extractRoot, `${rows[0].stl_id}.zip`);
  if (!(await isFresh(zipPath, await latestMtime(absolute)))) {
    await fs.promises.rm(zipPath, { force: true });
    await once(zipPath, () => zipDirectory(absolute, zipPath));
  }
  return { absolute: zipPath, fileName: `${rows[0].stl_nom}.zip` };
}

module.exports = { getModelFile, getModelDownload };
