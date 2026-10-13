const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Toutes les archives (zip, rar, 7z) passent par le binaire 7z (paquets Debian 7zip + 7zip-rar).
const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z']);
const SEVEN_ZIP = process.env.SEVEN_ZIP_BIN || '7z';

function getExt(name) {
  const ext = path.extname(name);
  return ext ? ext.slice(1).toLowerCase() : '';
}

function isArchive(name) {
  return ARCHIVE_EXTENSIONS.has(getExt(name));
}

// Fichiers/dossiers parasites (macOS, Synology, Windows) à ne jamais indexer.
function isIgnoredName(name) {
  return name.startsWith('.') || name === '@eaDir' || name === '__MACOSX' || name === 'Thumbs.db';
}

function run7z(args, { cwd, stdout } = {}) {
  return new Promise((resolve, reject) => {
    // stdin fermé : une archive chiffrée échoue au lieu d'attendre un mot de passe.
    const child = spawn(SEVEN_ZIP, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let stderr = '';
    if (stdout) child.stdout.pipe(stdout);
    else child.stdout.on('data', (c) => chunks.push(c));
    child.stderr.on('data', (c) => { stderr += c; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`7z ${args[0]} a échoué (code ${code}): ${stderr.trim()}`));
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
  });
}

// Liste le contenu d'une archive sans l'extraire. Retourne [{ path, size }] (fichiers uniquement).
async function listArchive(archivePath) {
  const out = await run7z(['l', '-slt', '-sccUTF-8', archivePath]);
  // Les blocs d'entrées suivent la ligne "----------" ; le bloc avant décrit l'archive elle-même.
  const body = out.split(/^-{10}$/m).slice(1).join('\n');
  const entries = [];
  for (const block of body.split(/\r?\n\r?\n/)) {
    const fields = {};
    for (const line of block.split(/\r?\n/)) {
      const idx = line.indexOf(' = ');
      if (idx > 0) fields[line.slice(0, idx)] = line.slice(idx + 3);
    }
    if (!fields.Path || fields.Folder === '+') continue;
    if ((fields.Attributes || '').startsWith('D')) continue;
    entries.push({ path: fields.Path.replace(/\\/g, '/'), size: Number(fields.Size) || 0 });
  }
  return entries;
}

// Extrait une seule entrée de l'archive vers dest (écriture atomique via fichier temporaire).
async function extractEntry(archivePath, entryPath, dest) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
  const out = fs.createWriteStream(tmp);
  try {
    // -spd : pas d'interprétation des jokers (* ?) dans le nom demandé.
    await run7z(['e', '-so', '-spd', '-y', archivePath, '--', entryPath], { stdout: out });
    await new Promise((resolve, reject) => {
      if (out.writableFinished) return resolve();
      out.on('finish', resolve);
      out.on('error', reject);
    });
    await fs.promises.rename(tmp, dest);
  } catch (err) {
    out.destroy();
    await fs.promises.rm(tmp, { force: true });
    throw err;
  }
}

// Zippe un dossier de modèle complet (téléchargement), comme le faisait zip2download() en PHP.
async function zipDirectory(dirPath, dest) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
  try {
    await run7z(
      ['a', '-tzip', '-mx=1', '-y', '-xr!@eaDir', '-xr!__MACOSX', '-xr!.*', tmp, path.basename(dirPath)],
      { cwd: path.dirname(dirPath) }
    );
    await fs.promises.rename(tmp, dest);
  } catch (err) {
    await fs.promises.rm(tmp, { force: true });
    throw err;
  }
}

module.exports = { getExt, isArchive, isIgnoredName, listArchive, extractEntry, zipDirectory };
