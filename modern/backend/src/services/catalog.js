const fs = require('fs');
const path = require('path');
const { query } = require('../db');
const { modelsRoot } = require('../config');
const { safeResolve } = require('../utils/path');

async function listCategories(accessLevel = 0) {
  return query(
    'SELECT lib_id, lib_nom, lib_free FROM libelles WHERE lib_nom_id = 0 AND lib_free <= ? ORDER BY lib_nom ASC',
    [accessLevel]
  );
}

async function listModelsByCategory(categoryName, accessLevel = 0) {
  const rows = await query(
    `SELECT stl.stl_id, stl.stl_nom, stl.stl_date_ajout, stl.stl_nb_dl, stl.stl_thumbnail, stl.stl_path, lib.lib_nom as category, lib.lib_free
     FROM stl
     INNER JOIN libelles lib ON lib.lib_id = stl.lib_id_categorie
     WHERE lib.lib_nom = ? AND lib.lib_free <= ?
     ORDER BY stl.stl_date_ajout DESC`,
    [categoryName, accessLevel]
  );

  return rows.map((r) => ({
    id: r.stl_id,
    name: r.stl_nom,
    addedAt: r.stl_date_ajout,
    downloads: r.stl_nb_dl || 0,
    thumbnail: r.stl_thumbnail ? `/api/models/${r.stl_id}/thumbnail/${encodeURIComponent(r.stl_thumbnail)}` : null,
    category: r.category,
    path: r.stl_path
  }));
}

async function getModel(modelId, accessLevel = 0) {
  const rows = await query(
    `SELECT stl.stl_id, stl.stl_nom, stl.stl_date_ajout, stl.stl_nb_dl, stl.stl_printed, stl.stl_observations, stl.stl_path,
            lib.lib_nom as category, lib.lib_free
      FROM stl INNER JOIN libelles lib ON lib.lib_id = stl.lib_id_categorie
      WHERE stl.stl_id = ? AND lib.lib_free <= ? LIMIT 1`,
    [modelId, accessLevel]
  );
  if (!rows.length) return null;

  const files = await query(
    'SELECT nom, type, chemin, taille FROM fichiers_stl WHERE stl_id = ? ORDER BY taille DESC',
    [modelId]
  );

  return {
    id: rows[0].stl_id,
    name: rows[0].stl_nom,
    addedAt: rows[0].stl_date_ajout,
    downloads: rows[0].stl_nb_dl || 0,
    printed: !!rows[0].stl_printed,
    notes: rows[0].stl_observations,
    category: rows[0].category,
    path: rows[0].stl_path,
    files: files.map((f) => ({
      name: f.nom,
      type: f.type,
      path: f.chemin,
      size: f.taille
    }))
  };
}

async function incrementDownloads(modelId) {
  await query('UPDATE stl SET stl_nb_dl = COALESCE(stl_nb_dl, 0) + 1 WHERE stl_id = ?', [modelId]);
}

async function getModelDownloadPath(modelId) {
  const rows = await query('SELECT stl_nom, stl_path FROM stl WHERE stl_id = ? LIMIT 1', [modelId]);
  if (!rows.length) return null;
  const relative = path.join(path.basename(rows[0].stl_path), rows[0].stl_nom);
  const absolute = safeResolve(modelsRoot, relative);
  if (!fs.existsSync(absolute)) return null;
  return { absolute, fileName: rows[0].stl_nom };
}

async function listAdminCategories() {
  return query('SELECT lib_id, lib_nom, lib_free FROM libelles WHERE lib_nom_id = 0 ORDER BY lib_nom ASC');
}

async function createCategory(name, rightLevel) {
  const result = await query('INSERT INTO libelles (lib_nom, lib_nom_id, lib_free) VALUES (?, 0, ?)', [name, rightLevel]);
  return result.insertId;
}

async function updateCategory(id, name, rightLevel) {
  await query('UPDATE libelles SET lib_nom = ?, lib_free = ? WHERE lib_id = ? AND lib_nom_id = 0', [name, rightLevel, id]);
}

async function deleteCategory(id) {
  await query('DELETE FROM libelles WHERE lib_id = ? AND lib_nom_id = 0', [id]);
}

async function getDomain() {
  const rows = await query(
    `SELECT libelles.lib_id, libelles.lib_nom
     FROM libelles
     JOIN libelles_noms ON libelles.lib_nom_id = libelles_noms.lib_nom_id
     WHERE libelles_noms.lib_nom_nom = 'domain' LIMIT 1`
  );
  return rows[0] ?? null;
}

async function updateDomain(value) {
  const domain = await getDomain();
  if (!domain) throw new Error('Domain setting not found');
  await query('UPDATE libelles SET lib_nom = ? WHERE lib_id = ?', [value, domain.lib_id]);
}

module.exports = {
  listCategories,
  listModelsByCategory,
  getModel,
  incrementDownloads,
  getModelDownloadPath,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getDomain,
  updateDomain
};
