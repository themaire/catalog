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
        pas de `/var/www/html`) : on part des exemples, déplacés dans `./modeles/`
        (bind mount en lecture seule sur le backend ; le reste de `./modeles` est
        ignoré par git).
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
- [x] Reprendre `modern/backend` tel quel (auth JWT, CRUD catégories déjà écrits),
      l'intégrer dans un `Dockerfile` (node:20-alpine ou node:20-bookworm-slim —
      bookworm pour compat `arm64` Pi5 + binaires natifs d'archives).
- [x] Installer les outils d'extraction d'archives dans l'image : `unzip`, `unrar`
      (ou `unrar-free`/`p7zip-full`), `7zip` — en shellant comme le faisait le PHP
      (`exec unrar e ...`), pattern déjà prouvé viable, pas besoin de réinventer
      avec des libs JS fragiles pour RAR/7z.
- [x] Module `scan.ts` : porter la logique de `2bdd.php` + `func_fichiers.php` :
      - parcours récursif de `models/<domain>/<nom_modèle>/...`
      - détection fichier simple vs archive (zip/rar/7z)
      - pour une archive : lister son contenu sans extraction complète
      - upsert en base (`stl`, `fichiers`), nettoyage des entrées orphelines
        (dossiers supprimés) comme le faisait `delBdd()`.
- [x] `node-cron` dans `server.js`/`app.js` : équivalent du cron `*/10 ...` existant.
- [x] Endpoint `GET /api/models/:id/files/:fileId/extract` : extrait (ou lit le
      cache) le fichier demandé depuis l'archive, le stream en réponse.
- [x] Endpoint thumbnail déjà présent (`stl_thumbnail`) à relier à la première
      image trouvée dans l'archive au moment du scan (logique `getStArchName`).

Réalisé (notes) :
- Image `node:24-trixie-slim` (Node 20 est EOL depuis avril 2026) ; `7zip` + `7zip-rar`
  (non-free) : un seul binaire `7z` pour zip/rar/7z. Le support RAR n'a pas pu être
  testé faute d'archive RAR de test (pas d'outil libre pour en créer).
- Code resté en JavaScript (CommonJS) comme le reste du backend : `services/scan.js`
  au lieu de `scan.ts`.
- Scan : resynchronise à chaque passage (ajouts/suppressions de fichiers et de modèles),
  crée les catégories inconnues (`SCAN_NEW_CATEGORY_LEVEL`), refuse de tourner si
  `models/` est vide. Déclenchable à la main : `POST /api/admin/scan`.
- Vignette = première image du modèle (dossier ou archive), copiée/extraite dans le cache.
- `download` : zip du dossier à la volée (en cache) pour les modèles-dossiers, et
  contrôle d'accès par catégorie (comme `extract`). **Conséquence pour le Lot 3** : le
  lien de téléchargement du frontend (simple `<a href>` sans token) renvoie 404 pour
  les catégories non publiques → passer par HttpClient (blob) avec le token.
- Backend exposé temporairement sur `127.0.0.1:3080` (3000 = Grafana sur piserve).
- `getModel` renvoie maintenant `id` et `url` (endpoint extract) pour chaque fichier.

### Lot 3 — Frontend : viewer 3D
- [x] Ajouter `three` au frontend Angular (`npm install three`).
- [x] Composant `stl-viewer` : charge le STL via l'endpoint d'extraction du Lot 2
      avec `STLLoader`, rendu dans un `<canvas>` (orbit controls, lumière simple).
- [x] Intégrer le viewer dans `pages/detail` à la place/en complément de la liste
      de fichiers actuelle (garder le bouton téléchargement de l'archive complète).
- [x] Gérer le cas "pas de STL trouvé dans l'archive" (fallback sur la liste de
      fichiers existante).

Réalisé (notes) :
- Lib retenue : **online-3d-viewer** (o3dv, MIT, moteur de 3dviewer.net, basé sur three.js)
  plutôt que three.js nu : STL, OBJ+MTL, 3MF, STEP/IGES, PLY, AMF, OFF, glTF, FBX, 3DS, DAE
  avec caméra/éclairage/cadrage prêts. Chargée en `import()` dynamique (chunk lazy 1 Mo,
  232 Ko gzip) uniquement sur la fiche. Note : STEP/IGES/IFC chargent leur décodeur WASM
  depuis cdn.jsdelivr.net à la volée (besoin d'Internet pour ces formats seulement).
- Composant `components/viewer3d` : fichiers récupérés via HttpClient avec le token
  (blob → File → `LoadModelFromFileList`), pour un OBJ ajoute mtl/textures du même dossier.
- Fiche : viewer en tête, puces pour choisir le fichier 3D si plusieurs, lignes 3D de la
  liste cliquables ; pas de fichier 3D → pas de viewer, liste seule.
- Téléchargement de l'archive via HttpClient + token (corrige le 404 introduit au Lot 2).
- Extensions 3D ajoutées à `libelles` (3mf, step, stp, iges, igs, ply, amf, off, glb, gltf,
  fbx, 3ds, dae, mtl) pour que le scan les indexe.
- Dépendances réalignées : `@angular/material`/`cdk` 21 → 20 (incompatibles avec core 20),
  ajout explicite de `@angular/animations` (requis par `provideAnimationsAsync`).
- Vérifié dans Chromium headless (WebGL) : rendu des 2 STL d'exemple, changement de
  fichier, téléchargement.

### Lot 4 — Docker compose complet + déploiement piserve
- [x] Service `frontend` : build Angular multi-stage → Nginx, `proxy_pass /api`
      vers `backend:3000`.
- [x] `docker-compose.yml` final : réseaux, dépendances (`depends_on` + healthcheck
      DB), `.env` pour les secrets (JWT_SECRET, DB password, etc.), `.env.example`
      commité.
- [x] Sur piserve : `docker compose up --build -d`, vérifier logs des 3 services.
- [x] Vérifier l'accès réseau local (IP piserve sur le LAN) depuis un autre poste.

### Lot 5 — Nettoyage
- [x] Une fois la parité fonctionnelle validée : retirer `catalog/` (PHP legacy),
      `install.sh`, `files_install/` du dépôt (ou les déplacer dans `legacy/` pour
      archive, au choix).
- [x] Mettre à jour `README.md` (installation = `docker compose up`, plus de script
      shell Raspberry Pi OS).
- [x] Changer le mot de passe admin par défaut inséré dans le dump SQL.

Réalisé (notes) :
- Legacy supprimé (pas de dossier `legacy/`) : `catalog/`, `install.sh`, `files_install/`,
  anciennes captures, `modern/MIGRATION.md`, `lib3d_db_model.txt`, `package.json` racine.
  Récupérable via l'étiquette git `php-legacy`.
- Mot de passe : le dump crée `admin` **sans mot de passe** ; au premier lancement le site
  redirige vers `/setup` pour le choisir (refusé une fois défini). Page *Mon compte*
  (`PUT /api/auth/password`) pour le changer, + limite de tentatives sur la connexion.
- Nouveau `install.sh` (pour une installation chez un tiers) : vérifie 64 bits/RAM, installe
  Docker si absent (get.docker.com), génère `.env`, lance la stack, attend qu'elle réponde.
  Testé sur une copie neuve du dépôt en parallèle de l'instance piserve.
- Compose : plus de `container_name` (plusieurs instances possibles sur une machine) ; ports
  de debug MariaDB/API déplacés dans `docker-compose.debug.yml` (évite un conflit avec un
  MariaDB déjà présent chez l'hôte).
- README réécrit (installation Docker, ajout de modèles, captures dans `docs/`).
- Correctif : dates `DATE` renvoyées en chaîne (plus de décalage d'un jour selon le fuseau).

## Pistes d'amélioration (après le v1)

- Gestion des utilisateurs dans l'admin (créer un modérateur, désactiver un compte).
- Renommer une catégorie dans l'admin ne renomme pas le dossier : un nouveau modèle déposé
  dans ce dossier recrée une catégorie du nom du dossier.
- Budget du bundle initial Angular dépassé (≈700 Ko pour 500 Ko) : avertissement seulement.
- Support RAR à valider avec de vraies archives.

## Points restants à trancher plus tard (pas bloquants pour démarrer)

- Garder le dump SQL brut en init, ou passer à un outil de migrations (ex.
  `node-pg-migrate`-like pour MySQL) — reporté après le v1 fonctionnel.
- Authentification : garder JWT custom actuel ou passer à une lib standard —
  pas de changement prévu tant que l'existant fonctionne.
- Taille/éviction du cache d'extraction (`extract-cache`) — à surveiller une fois
  en usage réel, pas de politique de purge pour le v1.
