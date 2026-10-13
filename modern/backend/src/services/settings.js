// Réglages persistés en base (table `settings`), dont le dossier des modèles choisi dans l'assistant.
const fs = require('fs');
const path = require('path');
const { query } = require('../db');
const { modelsRoot: defaultModelsRoot, browseRoots } = require('../config');

let modelsRoot = defaultModelsRoot;

async function initSettings() {
  // Bases créées avant l'ajout de la table : migration à la volée.
  await query(
    'CREATE TABLE IF NOT EXISTS settings (name VARCHAR(100) NOT NULL, value TEXT NOT NULL, PRIMARY KEY (name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  );
  const rows = await query("SELECT value FROM settings WHERE name = 'models_root'");
  if (rows.length) {
    if (fs.existsSync(rows[0].value)) {
      modelsRoot = rows[0].value;
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[settings] dossier des modèles introuvable (${rows[0].value}), retour à ${defaultModelsRoot}`);
    }
  }
}

function getModelsRoot() {
  return modelsRoot;
}

// Racines explorables (montages en lecture seule déclarés dans docker-compose) qui existent vraiment.
function getBrowseRoots() {
  return browseRoots.filter((r) => fs.existsSync(r.path));
}

// Résout un chemin demandé par le client et vérifie qu'il reste dans une racine autorisée
// (realpath : un lien symbolique ne permet pas d'en sortir). Retourne null sinon.
function resolveBrowsable(requested) {
  let real;
  try {
    real = fs.realpathSync(path.resolve(requested));
  } catch {
    return null;
  }
  const root = getBrowseRoots().find((r) => {
    const rootReal = fs.realpathSync(r.path);
    return real === rootReal || real.startsWith(`${rootReal}${path.sep}`);
  });
  return root ? { path: real, root } : null;
}

// Chemin tel que l'utilisateur le connaît sur sa machine (/host/media/x -> /media/x).
function displayPath(containerPath) {
  const root = browseRoots.find((r) => containerPath === r.path || containerPath.startsWith(`${r.path}/`));
  return root ? root.hostLabel + containerPath.slice(root.path.length) : containerPath;
}

async function setModelsRoot(containerPath) {
  await query('INSERT INTO settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [
    'models_root',
    containerPath
  ]);
  modelsRoot = containerPath;
}

module.exports = { initSettings, getModelsRoot, getBrowseRoots, resolveBrowsable, displayPath, setModelsRoot };
