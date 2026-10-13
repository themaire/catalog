const { query } = require('../db');

async function listCategories(accessLevel = 0) {
  return query(
    // Catégories vides masquées (ex. après un changement de dossier des modèles) ; l'admin les voit toutes.
    `SELECT lib_id, lib_nom, lib_free FROM libelles
     WHERE lib_nom_id = 1 AND lib_free <= ? AND EXISTS (SELECT 1 FROM stl WHERE stl.lib_id_categorie = libelles.lib_id)
     ORDER BY lib_nom ASC`,
    [accessLevel]
  );
}

async function listModelsByCategory(categoryName, accessLevel = 0) {
  const rows = await query(
    `SELECT stl.stl_id, stl.stl_nom, stl.stl_date_ajout, stl.stl_nb_dl, stl.stl_thumbnail, stl.stl_path, lib.lib_nom as category, lib.lib_free
     FROM stl
     INNER JOIN libelles lib ON lib.lib_id = stl.lib_id_categorie AND lib.lib_nom_id = 1
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
      FROM stl INNER JOIN libelles lib ON lib.lib_id = stl.lib_id_categorie AND lib.lib_nom_id = 1
      WHERE stl.stl_id = ? AND lib.lib_free <= ? LIMIT 1`,
    [modelId, accessLevel]
  );
  if (!rows.length) return null;

  const files = await query(
    `SELECT fi.fi_id, fi.fi_nom, fi.fi_path, fi.fi_taille, lib.lib_nom AS type
     FROM fichiers fi LEFT JOIN libelles lib ON lib.lib_id = fi.lib_id_type
     WHERE fi.stl_id = ? ORDER BY fi.fi_taille DESC`,
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
      id: f.fi_id,
      name: f.fi_nom,
      type: f.type,
      // Chemin relatif au modèle (dossier ou intérieur de l'archive)
      path: f.fi_path ? `${f.fi_path}/${f.fi_nom}` : f.fi_nom,
      size: f.fi_taille,
      url: `/api/models/${modelId}/files/${f.fi_id}/extract`
    }))
  };
}

async function incrementDownloads(modelId) {
  await query('UPDATE stl SET stl_nb_dl = COALESCE(stl_nb_dl, 0) + 1 WHERE stl_id = ?', [modelId]);
}

async function listAdminCategories() {
  return query('SELECT lib_id, lib_nom, lib_free FROM libelles WHERE lib_nom_id = 1 ORDER BY lib_nom ASC');
}

async function createCategory(name, rightLevel) {
  const result = await query('INSERT INTO libelles (lib_nom, lib_nom_id, lib_free) VALUES (?, 1, ?)', [name, rightLevel]);
  return result.insertId;
}

async function updateCategory(id, name, rightLevel) {
  await query('UPDATE libelles SET lib_nom = ?, lib_free = ? WHERE lib_id = ? AND lib_nom_id = 1', [name, rightLevel, id]);
}

async function deleteCategory(id) {
  await query('DELETE FROM libelles WHERE lib_id = ? AND lib_nom_id = 1', [id]);
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
  if (!domain) {
    const domainTypeRows = await query(`SELECT lib_nom_id FROM libelles_noms WHERE lib_nom_nom = 'domain' LIMIT 1`);
    if (!domainTypeRows.length) throw new Error('Domain type not found in libelles_noms');
    await query('INSERT INTO libelles (lib_nom, lib_nom_id, lib_free) VALUES (?, ?, NULL)', [value, domainTypeRows[0].lib_nom_id]);
  } else {
    await query('UPDATE libelles SET lib_nom = ? WHERE lib_id = ?', [value, domain.lib_id]);
  }
}

module.exports = {
  listCategories,
  listModelsByCategory,
  getModel,
  incrementDownloads,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getDomain,
  updateDomain
};
