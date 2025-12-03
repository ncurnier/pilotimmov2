# PilotImmo - Plateforme LMNP

Application web moderne pour la gestion locative meublée non professionnelle (LMNP) avec optimisation fiscale intégrée.

## 🚀 Démarrage rapide

```bash
# Installation des dépendances
npm install

# Démarrage en développement
npm run dev

# Build de production
npm run build

# Aperçu de production
npm run preview
```

## ⚙️ Configuration

### Variables d'environnement

Copiez `.env.example` vers `.env` et configurez vos variables Supabase :

```bash
cp .env.example .env
```

Variables requises dans `.env` :

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Base de données Supabase

1. **Créez un projet Supabase** sur [supabase.com](https://supabase.com)
2. **Exécutez les migrations** via SQL Editor ou CLI Supabase
3. **Configurez l'authentification** (Email/Password activé)

Les migrations se trouvent dans `supabase/migrations/` et doivent être exécutées côté Supabase. Aucune migration n'est embarquée côté frontend.

## 🏗️ Architecture

### Stack technique

- **Frontend** : Vite + React 18 + TypeScript
- **Styling** : Tailwind CSS + Fonts (Montserrat, Playfair Display)
- **Backend** : Supabase (PostgreSQL + Auth + RLS)
- **State** : Zustand pour la gestion d'état locale
- **Icons** : Lucide React

### Structure du projet

```
src/
├── components/          # Composants React réutilisables
├── hooks/              # Hooks personnalisés
├── services/           # Services Supabase et API
│   └── supabase/       # Services base de données
├── store/              # Stores Zustand
├── utils/              # Utilitaires et helpers
├── config/             # Configuration (Supabase, etc.)
└── index.css           # Styles globaux
```

### Services Supabase

Tous les services suivent le pattern BaseService avec :
- CRUD standardisé
- Gestion d'erreur cohérente
- Logging automatique
- Types TypeScript stricts

## 🎯 Fonctionnalités

### Gestion LMNP complète

- ✅ **Authentification** - Inscription/connexion sécurisée
- ✅ **Biens immobiliers** - CRUD complet des propriétés
- ✅ **Locataires** - Gestion des baux et contacts
- ✅ **Revenus** - Suivi des loyers et recettes
- ✅ **Dépenses** - Charges déductibles par catégorie
- ✅ **Amortissements** - Calculs automatiques selon règles LMNP
- ✅ **Déclarations** - Génération et suivi fiscal
  - Edition de la liasse fiscale complète : mapping structuré des formulaires 2031/2031 bis/2033 basé sur les données comptables
    et validations de cohérence
  - Export horodaté de la liasse en PDF ou payload EDI avec journalisation des générations
  - Nouvelle interface de revue/édition des cases fiscales intégrée aux détails de déclaration
- ✅ **Dashboard** - Statistiques et KPIs en temps réel

### Services additionnels

- 📚 **Formations** - Modules d'apprentissage LMNP
- 👥 **Communauté** - Forum d'entraide entre investisseurs
- 🛒 **Marketplace** - Réseau de partenaires experts
- 🔔 **Notifications** - Alertes et rappels personnalisés

## 🔒 Sécurité

- **Row Level Security (RLS)** activé sur toutes les tables
- **Authentification Supabase** avec email/password
- **Isolation des données** par utilisateur
- **Validation côté client et serveur**

## 🚀 Déploiement

### Build de production

```bash
npm run build
```

Le build génère un dossier `dist/` prêt pour déploiement statique.

### Variables d'environnement production

Configurez les mêmes variables que pour le développement :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Plateformes supportées

- Vercel, Netlify, GitHub Pages
- Tout hébergeur de sites statiques
- CDN avec support SPA

## 📊 Base de données

### Tables principales

- `users` - Profils utilisateurs et préférences
- `properties` - Biens immobiliers LMNP
- `tenants` - Locataires et baux
- `revenues` - Revenus locatifs
- `expenses` - Dépenses déductibles
- `amortizations` - Amortissements d'équipements
- `declarations` - Déclarations fiscales
- `notifications` - Système d'alertes

### Migrations

Les migrations SQL se trouvent dans `supabase/migrations/` et doivent être appliquées via :
- Supabase Dashboard (SQL Editor)
- Supabase CLI (`supabase db push`)

**Important** : Aucune migration n'est exécutée côté frontend pour des raisons de sécurité.

## 🛠️ Développement

### Commandes disponibles

```bash
npm run dev      # Serveur de développement (port 5173)
npm run build    # Build de production
npm run preview  # Aperçu du build
npm run lint     # Vérification ESLint
```

### Alias de chemins

Le projet utilise l'alias `@` pour les imports :

```typescript
import { propertyService } from '@/services/supabase/properties'
import logger from '@/utils/logger'
```

### État vide

Si aucune donnée n'est présente, l'application affiche des états vides avec des actions pour guider l'utilisateur plutôt que de planter.

## 📝 Notes importantes

- **Aucun seed/test embarqué** - Données créées via l'interface utilisateur
- **Pas de PL/pgSQL inline** - Toute logique complexe côté Supabase
- **Build optimisé** - Minification et tree-shaking automatiques
- **Types stricts** - TypeScript configuré en mode strict

## 🆘 Support

En cas de problème :
1. Vérifiez les variables d'environnement
2. Contrôlez la connexion Supabase
3. Consultez les logs du navigateur
4. Vérifiez que les migrations sont appliquées

---

**PilotImmo** - Simplifiez votre gestion locative LMNP