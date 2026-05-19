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
  thumbnailsRoot: path.resolve(process.env.THUMBNAILS_ROOT || '/var/www/html/catalog/tmp/img')
};
