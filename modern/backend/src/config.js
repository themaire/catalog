const path = require('path');

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lib3d'
  },
  modelsRoot: path.resolve(process.env.MODELS_ROOT || '/var/www/html/catalog/models'),
  thumbnailsRoot: path.resolve(process.env.THUMBNAILS_ROOT || '/var/www/html/catalog/tmp/img'),
  // Cache des fichiers extraits des archives à la demande + zips de téléchargement des dossiers.
  extractRoot: path.resolve(process.env.EXTRACT_ROOT || '/var/www/html/catalog/tmp/extract'),
  // Emplacements de l'hôte montés en lecture seule, explorables par l'assistant pour choisir
  // le dossier des modèles. hostLabel = chemin affiché (tel qu'il existe sur l'hôte).
  browseRoots: [
    { path: path.resolve(process.env.MODELS_ROOT || '/var/www/html/catalog/models'), hostLabel: 'modeles (dossier du projet)', label: 'Dossier du projet' },
    { path: '/host/media', hostLabel: '/media', label: 'Disques USB (/media)' },
    { path: '/host/mnt', hostLabel: '/mnt', label: 'Montages (/mnt)' },
    { path: '/host/home', hostLabel: '/home', label: 'Dossiers personnels (/home)' }
  ],
  scan: {
    // Expression cron (node-cron) ; vide = pas de scan planifié.
    cron: process.env.SCAN_CRON ?? '*/10 * * * *',
    onStartup: process.env.SCAN_ON_STARTUP !== 'false',
    // Niveau d'accès (lib_free) des catégories créées automatiquement par le scan : 0=public, 1=modérateur, 2=admin.
    newCategoryLevel: Number(process.env.SCAN_NEW_CATEGORY_LEVEL ?? 1)
  }
};
