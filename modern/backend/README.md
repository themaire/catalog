# Catalog API (modern backend)

Backend API Express pour migrer le catalogue PHP vers une architecture frontend/backend séparée.

## Configuration sécurité

- Renseigner `MOD_PASSWORD_HASH` et/ou `ADMIN_PASSWORD_HASH` avec des hashes bcrypt.
- Exemple de génération hash:

```bash
node -e "const b=require('bcryptjs'); b.hash('mon-mot-de-passe', 12).then(console.log)"
```

## Endpoints principaux

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/categories`
- `GET /api/models?category=<name>`
- `GET /api/models/:id`
- `GET /api/models/:id/download` (rate-limited)
- `GET /api/models/:id/thumbnail/:file`
- `GET|POST|PUT|DELETE /api/admin/categories` (admin)
- `GET|PUT /api/admin/domain` (admin)

## Lancement local

```bash
cp .env.example .env
npm install
npm run dev
```

Le backend s'appuie sur le schéma existant `lib3d` (tables `libelles`, `stl`, `fichiers_stl`).
