# Plan de modernisation — Catalog (STL 3D)

## Contexte

Projet PHP5 de 2020 : catalogue de modèles d'impression 3D, scannant un dossier
`models/` (sous-dossiers ou archives ZIP/RAR/7z) et exposant une liste/fiche en
PHP + MySQL/MariaDB. Idée de départ : visualiser un modèle 3D dans le navigateur
sans avoir à tout décompresser à la main.

Un début de portage existe déjà dans `modern/` (Express + Angular) mais ne couvre
que l'auth JWT et un CRUD catégories/modèles en lecture sur une base déjà peuplée.
Il manque les deux pièces centrales :

1. Le **scan/sync** du dossier `models/` (équivalent `catalog/2bdd.php` +
   `lib/fonctions/func_archives.php`) — rien n'est porté.
2. La **visualisation 3D dans le navigateur** — le frontend actuel ne fait que
   lister les fichiers et proposer un téléchargement.

Le schéma SQL (`lib3d_bdd.sql`) reste valide et sera repris tel quel pour le v1.

## Environnement de déploiement

- **Développement/exécution réelle** : Raspberry Pi 5, host `piserve` (`ssh piserve`),
  Docker 29.8.1 / Compose v5.5.1 déjà installés. Chemin cible :
  `~/Documents/github/catalog` (n'existe pas encore sur piserve).
- **MacBook** : pas de Docker disponible → utilisé uniquement pour édition de code
  et `git push`, jamais pour lancer la stack.
- **Boucle de travail recommandée** : coder en local, push sur le repo GitHub
  (`themaire/catalog`), puis sur `piserve` : `git pull` + `docker compose up --build`.
  Alternative possible plus tard : VS Code Remote-SSH / Claude Code direct sur
  piserve pour éviter l'aller-retour push/pull — à activer si l'aller-retour
  devient pénible.

## Architecture cible

```
docker-compose.yml
├── db        → MariaDB 10.11, init via lib3d_bdd.sql (volume nommé pour persistance)
├── backend   → Node/Express (TypeScript), API + job de scan (node-cron intégré)
├── frontend  → Angular buildé, servi par Nginx, proxy /api → backend
└── volumes
    ├── ./models        (bind mount) — dépôt des archives/dossiers de modèles
    └── db-data          (volume nommé) — données MariaDB
    └── extract-cache    (volume nommé) — cache des STL extraits à la demande
```

Décisions actées :
- **DB** : on garde MariaDB + le schéma existant (`lib3d_bdd.sql`), zéro migration
  de données pour le v1.
- **Extraction STL** : à la demande + cache disque (pas d'extraction complète au
  scan). Le backend extrait le fichier précis depuis l'archive seulement quand la
  fiche détail est ouverte, écrit le résultat dans `extract-cache`, et le ressert
  ensuite sans ré-extraire.
- **Scan planifié** : intégré au conteneur `backend` via `node-cron` (pas de
  conteneur worker séparé pour le v1).

## Découpage en tâches

### Lot 0 — Mise en place du dépôt sur piserve
- [x] Sur piserve : `mkdir -p ~/Documents/github && cd ~/Documents/github && git clone <repo> catalog`
- [x] Copier `/home/pi/models` (ou équivalent existant) vers `catalog/models` si des
      archives réelles existent déjà sur une install précédente — sinon dossier vide
      avec les deux exemples déjà versionnés (`models/thingiverse/...`).
      → Aucune install précédente accessible sur piserve (`/home/pi` non lisible,
        pas de `/var/www/html`) : on part des exemples dans `catalog/models/`.
- [x] Vérifier qu'aucun `.env` ni secret n'est poussé par erreur (`.gitignore`).

### Lot 1 — Dockerisation de la base
- [x] `docker-compose.yml` : service `db` (image `mariadb:10.11`), variables d'env
      pour root password / user applicatif, montage de `lib3d_bdd.sql` dans
      `/docker-entrypoint-initdb.d/` pour l'init automatique au premier démarrage.
- [x] Ajouter la table `users` (déjà présente dans le dump) + vérifier le hash
      admin par défaut — **à changer après premier démarrage**.
      → Corrigé dans le dump : `PRIMARY KEY` en double sur `libelles` (faisait échouer
        l'init) et `INSERT` admin jamais commité (`AUTOCOMMIT=0` + insert après le
        `COMMIT`). Compte `admin` (role 2, bcrypt) bien créé, mot de passe par défaut `admin` →
        à changer (Lot 5).
- [x] Volume nommé `db-data` pour la persistance.

### Lot 2 — Backend : reprise de l'existant + scan
- [ ] Reprendre `modern/backend` tel quel (auth JWT, CRUD catégories déjà écrits),
      l'intégrer dans un `Dockerfile` (node:20-alpine ou node:20-bookworm-slim —
      bookworm pour compat `arm64` Pi5 + binaires natifs d'archives).
- [ ] Installer les outils d'extraction d'archives dans l'image : `unzip`, `unrar`
      (ou `unrar-free`/`p7zip-full`), `7zip` — en shellant comme le faisait le PHP
      (`exec unrar e ...`), pattern déjà prouvé viable, pas besoin de réinventer
      avec des libs JS fragiles pour RAR/7z.
- [ ] Module `scan.ts` : porter la logique de `2bdd.php` + `func_fichiers.php` :
      - parcours récursif de `models/<domain>/<nom_modèle>/...`
      - détection fichier simple vs archive (zip/rar/7z)
      - pour une archive : lister son contenu sans extraction complète
      - upsert en base (`stl`, `fichiers`), nettoyage des entrées orphelines
        (dossiers supprimés) comme le faisait `delBdd()`.
- [ ] `node-cron` dans `server.js`/`app.js` : équivalent du cron `*/10 ...` existant.
- [ ] Endpoint `GET /api/models/:id/files/:fileId/extract` : extrait (ou lit le
      cache) le fichier demandé depuis l'archive, le stream en réponse.
- [ ] Endpoint thumbnail déjà présent (`stl_thumbnail`) à relier à la première
      image trouvée dans l'archive au moment du scan (logique `getStArchName`).

### Lot 3 — Frontend : viewer 3D
- [ ] Ajouter `three` au frontend Angular (`npm install three`).
- [ ] Composant `stl-viewer` : charge le STL via l'endpoint d'extraction du Lot 2
      avec `STLLoader`, rendu dans un `<canvas>` (orbit controls, lumière simple).
- [ ] Intégrer le viewer dans `pages/detail` à la place/en complément de la liste
      de fichiers actuelle (garder le bouton téléchargement de l'archive complète).
- [ ] Gérer le cas "pas de STL trouvé dans l'archive" (fallback sur la liste de
      fichiers existante).

### Lot 4 — Docker compose complet + déploiement piserve
- [ ] Service `frontend` : build Angular multi-stage → Nginx, `proxy_pass /api`
      vers `backend:3000`.
- [ ] `docker-compose.yml` final : réseaux, dépendances (`depends_on` + healthcheck
      DB), `.env` pour les secrets (JWT_SECRET, DB password, etc.), `.env.example`
      commité.
- [ ] Sur piserve : `docker compose up --build -d`, vérifier logs des 3 services.
- [ ] Vérifier l'accès réseau local (IP piserve sur le LAN) depuis un autre poste.

### Lot 5 — Nettoyage
- [ ] Une fois la parité fonctionnelle validée : retirer `catalog/` (PHP legacy),
      `install.sh`, `files_install/` du dépôt (ou les déplacer dans `legacy/` pour
      archive, au choix).
- [ ] Mettre à jour `README.md` (installation = `docker compose up`, plus de script
      shell Raspberry Pi OS).
- [ ] Changer le mot de passe admin par défaut inséré dans le dump SQL.

## Points restants à trancher plus tard (pas bloquants pour démarrer)

- Garder le dump SQL brut en init, ou passer à un outil de migrations (ex.
  `node-pg-migrate`-like pour MySQL) — reporté après le v1 fonctionnel.
- Authentification : garder JWT custom actuel ou passer à une lib standard —
  pas de changement prévu tant que l'existant fonctionne.
- Taille/éviction du cache d'extraction (`extract-cache`) — à surveiller une fois
  en usage réel, pas de politique de purge pour le v1.
