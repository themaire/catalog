const path = require('path');
const { getModelsRoot } = require('../services/settings');
const { safeResolve } = require('./path');

// stl.stl_path est stocké comme en PHP, relatif à la racine de l'ancien site : "models/<catégorie>[/<englobant>]".
const MODELS_PREFIX = 'models';

// Chemin absolu d'un modèle (dossier ou archive) à partir de stl_path + stl_nom.
function modelAbsolutePath(stlPath, stlNom) {
  const segments = stlPath.split('/').filter(Boolean);
  if (segments[0] === MODELS_PREFIX) segments.shift();
  return safeResolve(getModelsRoot(), path.join(...segments, stlNom));
}

module.exports = { MODELS_PREFIX, modelAbsolutePath };
