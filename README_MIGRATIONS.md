# Guide des Migrations LMNP - Postgres/Supabase

## 🎯 Décisions techniques

### Génération d'IDs
- **Extension choisie** : `pgcrypto` avec `gen_random_uuid()`
- **Raison** : Plus léger que `uuid-ossp`, intégré nativement dans Postgres moderne
- **Format** : UUID v4 pour toutes les nouvelles tables
- **Colonnes user_id** : Conservées en `text` pour compatibilité avec Supabase Auth

### Architecture des données
- **Tables principales** : users, properties, revenues, expenses, declarations, notifications
- **Nouvelles tables** : tenants, amortizations
- **Liaisons** : Toutes les données métier liées aux propriétés via `property_id`
- **Sécurité** : RLS activé sur toutes les tables avec policies basées sur `auth.uid()`

## 🚀 Procédure de déploiement

### 1. Pré-requis
```sql
-- Vérifier la version de Postgres
SELECT version();

-- Vérifier les extensions disponibles
SELECT * FROM pg_available_extensions WHERE name IN ('pgcrypto', 'uuid-ossp');
```

### 2. Ordre d'exécution des migrations
```bash
# 1. Correction des fonctions uid() existantes
psql -f supabase/migrations/fix_uid_functions.sql

# 2. Création de la table tenants
psql -f supabase/migrations/create_tenants_table.sql

# 3. Création de la table amortizations
psql -f supabase/migrations/create_amortizations_table.sql

# 4. Tests de validation
psql -f test_migrations.sql
```

### 3. Variables d'environnement
```bash
# Supabase
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Base de données
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

### 4. Validation post-déploiement
- [ ] Extensions `pgcrypto` activée
- [ ] Toutes les tables ont RLS activé
- [ ] Policies fonctionnelles (test avec différents utilisateurs)
- [ ] Triggers `updated_at` opérationnels
- [ ] Calculs d'amortissement corrects
- [ ] Index créés et performants

## 🔄 Plan de rollback

### Rollback complet (si problème majeur)
```sql
-- 1. Supprimer les nouvelles tables
DROP TABLE IF EXISTS amortizations CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 2. Restaurer les policies originales (si sauvegardées)
-- Voir backup_policies.sql

-- 3. Restaurer la colonne uid si renommée
ALTER TABLE users RENAME COLUMN user_id TO uid;
```

### Rollback partiel (problème spécifique)
```sql
-- Désactiver RLS temporairement
ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;

-- Supprimer une policy problématique
DROP POLICY IF EXISTS "[policy_name]" ON [table_name];

-- Recréer avec correction
CREATE POLICY "[policy_name]" ON [table_name] ...;
```

### Sauvegarde préventive
```sql
-- Sauvegarder les policies existantes avant migration
SELECT 
  schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('users', 'properties', 'revenues', 'expenses', 'declarations', 'notifications')
\g backup_policies.sql
```

## 📋 Checklist post-déploiement

### Tests fonctionnels
- [ ] **Authentification** : Connexion/déconnexion utilisateur
- [ ] **Propriétés** : CRUD complet des biens immobiliers
- [ ] **Locataires** : Ajout, modification, changement de locataire
- [ ] **Revenus** : Saisie des loyers et autres revenus
- [ ] **Dépenses** : Saisie des charges déductibles
- [ ] **Amortissements** : Calculs automatiques selon règles LMNP
- [ ] **Déclarations** : Génération avec tous les éléments

### Tests de sécurité
- [ ] **Isolation utilisateurs** : Un utilisateur ne voit que ses données
- [ ] **Policies RLS** : INSERT/UPDATE/DELETE restreints au propriétaire
- [ ] **Injection SQL** : Tests avec caractères spéciaux
- [ ] **Authentification** : Accès refusé sans token valide

### Tests de performance
- [ ] **Index utilisés** : EXPLAIN ANALYZE sur requêtes critiques
- [ ] **Temps de réponse** : < 100ms pour requêtes simples
- [ ] **Concurrence** : Tests avec plusieurs utilisateurs simultanés

### Tests de données
- [ ] **Calculs amortissements** : Vérification formules LMNP
- [ ] **Contraintes** : Montants négatifs rejetés
- [ ] **Triggers** : updated_at mis à jour automatiquement
- [ ] **Cascades** : Suppression propriété → suppression données liées

## 🔧 Dépannage

### Erreurs courantes

#### `division by zero` dans les calculs d'amortissement
```sql
-- Vérifier les enregistrements avec useful_life_years <= 0
SELECT * FROM amortizations WHERE useful_life_years <= 0;

-- Corriger manuellement si nécessaire
UPDATE amortizations SET useful_life_years = 10 WHERE useful_life_years <= 0 AND category = 'mobilier';
```

#### `function uid() does not exist`
```sql
-- Vérifier les policies utilisant uid()
SELECT * FROM pg_policies WHERE qual LIKE '%uid()%' OR with_check LIKE '%uid()%';

-- Remplacer par auth.uid()::text
```

#### `extension "pgcrypto" is not available`
```sql
-- Vérifier les extensions disponibles
SELECT * FROM pg_available_extensions WHERE name = 'pgcrypto';

-- Alternative avec uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Puis remplacer gen_random_uuid() par uuid_generate_v4()
```

#### `permission denied for table`
```sql
-- Vérifier RLS
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = '[table]';

-- Vérifier policies
SELECT * FROM pg_policies WHERE tablename = '[table]';
```

#### `constraint violation`
```sql
-- Vérifier les contraintes
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = '[table]'::regclass;
```

### Monitoring
```sql
-- Surveiller les calculs d'amortissement
SELECT 
  item_name, purchase_amount, useful_life_years, annual_amortization,
  CASE 
    WHEN useful_life_years > 0 THEN ROUND(purchase_amount / useful_life_years, 2)
    ELSE NULL 
  END as expected_annual
FROM amortizations 
WHERE annual_amortization IS NOT NULL;

-- Surveiller les performances
SELECT 
  schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables 
WHERE tablename IN ('properties', 'tenants', 'revenues', 'expenses', 'amortizations');

-- Surveiller les index
SELECT 
  schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('properties', 'tenants', 'revenues', 'expenses', 'amortizations');
```

## 📞 Support

En cas de problème :
1. Consulter les logs Supabase Dashboard
2. Exécuter le script de test `test_migrations.sql`
3. Vérifier la checklist post-déploiement
4. Utiliser le plan de rollback si nécessaire

## 📚 Références

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL UUID Functions](https://www.postgresql.org/docs/current/functions-uuid.html)
- [Règles LMNP Amortissements](https://www.service-public.fr/professionnels-entreprises/vosdroits/F31973)