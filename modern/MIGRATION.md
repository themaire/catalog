# Migration PHP -> Angular + API

Cette migration introduit une architecture moderne en conservant la base de données existante.

## Ce qui est implémenté

1. **Backend API Node/Express** (`modern/backend`)
   - Authentification par token JWT avec rôles (public/moderate/admin)
   - Endpoints catalogue (catégories, liste modèles, détail, téléchargement)
   - Endpoints administration (catégories + domain)

2. **Frontend Angular** (`modern/frontend`)
   - Routes: accueil, liste par catégorie, détail modèle, login, admin
   - Services HTTP vers l'API
   - Formulaires admin et connexion

## Stratégie d'adoption incrémentale

- Conserver l'application PHP en parallèle pendant la montée en charge.
- Brancher d'abord la consultation Angular (MVP), puis basculer l'admin.
- Décommissionner progressivement les pages PHP une fois la parité atteinte.

## Démarrage local

```bash
# Terminal 1
cd modern/backend
cp .env.example .env
npm install
npm run dev

# Terminal 2
cd modern/frontend
npm install
npm start
```

Le frontend Angular proxyfie `/api` vers `http://localhost:3000`.
