# 🧪 Guide des Tests - PilotImmo

## Vue d'ensemble

Le projet utilise une suite de tests complète pour assurer la qualité :
- **Tests unitaires** : Vitest pour la logique métier
- **Tests SQL** : Smoke tests pour valider la base de données
- **CI/CD** : GitHub Actions pour validation automatique

## 🚀 Lancement des tests

### Tests unitaires (Vitest)
```bash
# Exécuter tous les tests une fois
npm test

# Mode watch pour le développement
npm run test:watch

# Avec coverage
npm test -- --coverage
```

### Tests SQL (Smoke tests)
```bash
# 1. Définir la base de données de test
export DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# 2. Exécuter les smoke tests
npm run test:sql

# Ou directement avec psql
psql -v ON_ERROR_STOP=1 -f sql/smoke.sql
```

### Tests complets (comme en CI)
```bash
npm run ci:test
```

## 📁 Structure des tests

```
src/
├── smoke/           # Tests de base (infrastructure)
├── store/           # Tests des stores Zustand
├── utils/           # Tests des utilitaires
├── services/        # Tests des services Supabase
└── test/setup.ts    # Configuration globale des tests

sql/
└── smoke.sql        # Smoke tests SQL (pur, sans méta-commandes)

scripts/
└── test-sql.sh      # Script d'exécution des tests SQL

.github/workflows/
└── ci.yml           # Pipeline CI/CD
```

## 🔧 Configuration

### Variables d'environnement

#### Local (.env.test)
```bash
VITE_SUPABASE_URL=your-test-supabase-url
VITE_SUPABASE_ANON_KEY=your-test-anon-key
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

#### CI/CD (GitHub Secrets)
- `DATABASE_URL_TEST` : Base Supabase de test/staging

### Vitest (vitest.config.ts)
- **Environnement** : jsdom pour les composants React
- **Setup** : Mocks automatiques (localStorage, etc.)
- **Coverage** : Rapports de couverture disponibles

## 📊 Types de tests

### 1. Tests unitaires
- **Store Zustand** : Persistance, état, actions
- **Utilitaires** : Formatage, validation, calculs
- **Services** : Logique métier, transformations

### 2. Tests SQL
- **Extensions** : Vérification pgcrypto
- **UUID** : Génération et validation
- **Contraintes** : Validation des règles métier
- **Amortization** : Calculs et garde-fous

### 3. Tests d'intégration (CI)
- **Build** : Compilation sans erreur
- **Linting** : Qualité du code
- **Base de données** : Migrations et données

## 🚨 Dépannage

### Tests unitaires qui échouent
```bash
# Mode verbose
npm test -- --reporter=verbose

# Test spécifique
npm test -- src/store/useCurrentProperty.test.ts

# Debug mode
npm test -- --inspect-brk
```

### Tests SQL qui échouent
```bash
# Vérifier la connexion
psql "$DATABASE_URL" -c "SELECT current_database();"

# Exécuter manuellement
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/smoke.sql

# Logs détaillés
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -f sql/smoke.sql
```

### CI qui échoue
1. Vérifier que `DATABASE_URL_TEST` est défini dans les secrets GitHub
2. Contrôler les logs de la job `sql-tests`
3. Valider que la base de test est accessible
4. Tester localement avec la même configuration

## 📈 Métriques de qualité

### Coverage attendu
- **Store** : > 90% (logique critique)
- **Utils** : > 85% (fonctions pures)
- **Services** : > 70% (intégrations externes)

### Performance
- **Tests unitaires** : < 10s total
- **Tests SQL** : < 30s (base éphémère)
- **CI complète** : < 5min

## 🔄 Ajout de nouveaux tests

### Test unitaire
```typescript
// src/nouveauModule/monModule.test.ts
import { describe, it, expect } from 'vitest';
import { maFonction } from './monModule';

describe('Mon Module', () => {
  it('should do something', () => {
    expect(maFonction('input')).toBe('expected');
  });
});
```

### Test SQL
```sql
-- Ajouter dans sql/smoke.sql
-- Test XX: Description du test
DO $$
BEGIN
  -- Votre test ici
  RAISE NOTICE '✅ Test XX réussi';
END;
$$;
```

## 📞 Support

En cas de problème :
1. Vérifier la configuration dans `vitest.config.ts`
2. Contrôler les variables d'environnement
3. Exécuter les tests en mode verbose
4. Consulter les logs CI/CD

---

**Les tests sont maintenant opérationnels et visibles par la QA !** ✅