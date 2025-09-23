# PilotImmo - Plateforme LMNP avec Supabase

## Démarrage rapide

L'application utilise Supabase comme backend. Lancez simplement :

```bash
npm run dev
```

## Configuration Supabase

Copiez `.env.example` vers `.env` et configurez vos variables Supabase :

```bash
cp .env.example .env
# puis éditez .env avec vos clés Supabase
```

## Variables d'environnement

Définissez les clés suivantes dans `.env` :

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Ces variables sont utilisées dans `src/config/supabase.ts` pour initialiser Supabase.

## Structure de la base de données

### Tables créées :
- `users` - Profils utilisateurs avec préférences et statistiques
- `properties` - Biens immobiliers LMNP
- `revenues` - Revenus locatifs par propriété
- `expenses` - Dépenses déductibles
- `declarations` - Déclarations fiscales LMNP
- `notifications` - Système de notifications

## Fonctionnalités

✅ **Authentification** - Inscription/connexion avec Supabase Auth
✅ **Gestion des biens** - CRUD complet des propriétés LMNP
✅ **Revenus/Dépenses** - Suivi financier détaillé
✅ **Déclarations** - Création et gestion des déclarations fiscales
✅ **Dashboard** - Statistiques et graphiques en temps réel
✅ **Notifications** - Système d'alertes personnalisées

## Logging

Use the `logger` utility (`src/utils/logger.ts`) for application logging.

### Levels
- `logger.info(...args)` – informational messages, suppressed in production.
- `logger.warn(...args)` – warnings, suppressed in production.
- `logger.error(...args)` – errors, always logged; in production they are prefixed with `[ERROR]`.

### Usage

```ts
import logger from './utils/logger';

logger.info('Loaded component');
logger.error('Failed to fetch', err);
```