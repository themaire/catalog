# Catalog API (modern backend)

Backend API Express pour migrer le catalogue PHP vers une architecture frontend/backend séparée.

## Configuration sécurité

- Les comptes sont dans la table `users` (bcrypt). Le dump crée `admin` sans mot de passe : il est
  choisi au premier lancement (page `/setup`), puis modifiable dans *Mon compte*.
- Connexion et changement de mot de passe limités à 20 tentatives / 15 min par IP.
- Exemple de génération hash:

```bash
node -e "const b=require('bcryptjs'); b.hash('mon-mot-de-passe', 12).then(console.log)"
```

## Endpoints principaux

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/setup` — `{ required }` : vrai tant qu'aucun admin n'a de mot de passe
- `POST /api/auth/setup` — `{ password }` : premier lancement uniquement (409 ensuite), renvoie une session
- `PUT /api/auth/password` (connecté) — `{ currentPassword, newPassword }`, 8 caractères min.
- `GET /api/categories`
- `GET /api/models?category=<name>`
- `GET /api/models/:id`
- `GET /api/models/:id/download` (rate-limited) — archive telle quelle, ou zip du dossier (mis en cache)
- `GET /api/models/:id/files/:fileId/extract` — un fichier du modèle, extrait de l'archive à la demande (cache disque)
- `GET /api/models/:id/thumbnail/:file`
- `GET|POST|PUT|DELETE /api/admin/categories` (admin)
- `GET|PUT /api/admin/domain` (admin)
- `GET /api/admin/scan` (admin) — état du dernier scan
- `POST /api/admin/scan` (admin) — lance un scan immédiat du dossier `models/`

## Scan du dossier models

`src/services/scan.js` (portage de `catalog/2bdd.php`) synchronise `models/<catégorie>/<modèle>` avec les
tables `stl` / `fichiers` : au démarrage puis selon `SCAN_CRON` (toutes les 10 min par défaut).
Un modèle est un dossier ou une archive zip/rar/7z (listée via `7z`, sans extraction). Les catégories
inconnues sont créées avec le niveau `SCAN_NEW_CATEGORY_LEVEL`, les modèles disparus sont supprimés, et un
dossier `models/` vide annule le scan (garde-fou contre un montage absent).

## Lancement

Via Docker (recommandé) : `./install.sh` à la racine du dépôt, ou `docker compose up -d --build backend`.
L'image embarque `7z` + support RAR. Hors Docker, il faut `7z` dans le PATH.


```bash
cp .env.example .env
npm install
npm run dev
```

Le backend s'appuie sur le schéma existant `lib3d` (tables `libelles`, `stl`, `fichiers_stl`).
