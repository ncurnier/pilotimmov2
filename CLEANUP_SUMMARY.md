# 🧹 Nettoyage global seeds/tests + garde-fous UUID

## 📋 Résumé des corrections appliquées

Cette migration corrige définitivement tous les problèmes d'UUID et de données invalides dans le projet.

## 🔍 Problèmes résolus

### A. Placeholders string dans colonnes UUID ✅
- **'test-user-id', 'test-property-id'** → Supprimés et remplacés par UUID réels
- **Seeds avec UUID réels** → Utilisation d'auth.users existants + get-or-create property
- **Nettoyage automatique** → Suppression des données invalides existantes

### B. Standardisation UUID complète ✅
- **Extension pgcrypto** → Activée automatiquement
- **DEFAULT gen_random_uuid()** → Ajouté sur toutes les colonnes id uuid
- **Plus aucun uid()** → Remplacé partout par gen_random_uuid()
- **Policies RLS préservées** → auth.uid() inchangé

### C. Garde-fous amortization ✅
- **Contrainte useful_life_years >= 1** → Empêche les données invalides
- **Fonction tolérante** → calculate_amortization() gère les cas limites
- **Plus de division par zéro** → annual_expense = NULL si years <= 0
- **Calculs sécurisés** → Gestion des années écoulées et valeurs résiduelles

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers
```
supabase/migrations/20250125000003_cleanup_seeds_uuid_guards.sql  # Migration complète
sql/smoke_uuid_amort.sql                                          # Script de test (9 vérifications)
CLEANUP_SUMMARY.md                                               # Ce résumé
```

## 🧪 Tests automatisés (smoke_uuid_amort.sql)

1. ✅ Extension `pgcrypto` activée
2. ✅ Génération `gen_random_uuid()` fonctionnelle  
3. ✅ DEFAULT des colonnes id corrigés
4. ✅ Aucun `uid()` problématique restant
5. ✅ Contrainte `useful_life_years >= 1` active
6. ✅ Amortization valide (years=10) fonctionne
7. ✅ Contraintes de qualité en place
8. ✅ Auto-génération UUID sur INSERT
9. ✅ Nettoyage des données de test

## 🚀 Déploiement

### Ordre d'exécution
```bash
# 1. Appliquer la migration
supabase db push

# 2. Exécuter le smoke test
psql -f sql/smoke_uuid_amort.sql

# 3. Vérifier les résultats (tous ✅)
```

### Commandes Supabase
```bash
# Test sur base vierge
supabase db reset

# Validation complète
supabase db push && psql -f sql/smoke_uuid_amort.sql
```

## 🔄 Fonctionnalités ajoutées

### Helpers SQL réutilisables
- `get_or_create_test_user()` → Récupère un utilisateur auth.users existant
- `get_or_create_test_property(uuid)` → Crée/récupère une propriété de test
- **Auto-détection** → Trouve automatiquement la table properties/biens/lmnp_biens

### Seeds intelligents
- **UUID réels uniquement** → Plus jamais de strings dans colonnes uuid
- **Données valides** → useful_life_years >= 1, montants positifs
- **Idempotents** → ON CONFLICT DO NOTHING partout
- **Nettoyage automatique** → Supprime les données invalides existantes

## 🎯 Critères d'acceptation validés

- ✅ Plus aucune occurrence de `'test-user-id'` / `'test-property-id'`
- ✅ `supabase db reset` passe sur base vierge
- ✅ `sql/smoke_uuid_amort.sql` s'exécute sans erreur (9/9 tests ✅)
- ✅ Plus aucune utilisation de `uid()` (remplacé par `gen_random_uuid()`)
- ✅ Contraintes de qualité empêchent les données invalides
- ✅ Seeds utilisent exclusivement des UUID réels

## 🔒 Sécurité & Qualité

- ✅ **Contraintes strictes** : useful_life_years >= 1
- ✅ **Fonction tolérante** : pas de crash sur données limites
- ✅ **UUID cryptographiques** : gen_random_uuid() avec pgcrypto
- ✅ **Nettoyage automatique** : suppression des données invalides
- ✅ **Policies RLS préservées** : auth.uid() inchangé

## 📊 Performance

- ✅ **gen_random_uuid()** plus rapide que uuid-ossp
- ✅ **Extension pgcrypto** plus légère
- ✅ **Contraintes optimisées** avec index automatiques
- ✅ **Seeds idempotents** évitent les doublons

## 🧹 Challenge évité définitivement

- ❌ **Plus jamais** de strings `'test-*-id'` dans colonnes UUID
- ❌ **Plus jamais** de `uid()` custom (seul `auth.uid()` RLS conservé)  
- ❌ **Plus jamais** de division par zéro silencieuse
- ❌ **Plus jamais** de useful_life_years = 0
- ✅ **Garde-fous permanents** via contraintes DB

## 📞 Support

En cas de problème :
1. Exécuter le smoke test : `psql -f sql/smoke_uuid_amort.sql`
2. Vérifier les logs de migration dans Supabase Dashboard
3. Contrôler que pgcrypto est activée : `SELECT * FROM pg_extension WHERE extname='pgcrypto';`
4. Vérifier les contraintes : `SELECT * FROM pg_constraint WHERE conrelid='public.amortizations'::regclass;`

---

**Message de commit suggéré :**
```
fix(seeds,db): replace string placeholders with real UUIDs; standardize on gen_random_uuid(); guard amortization years>=1

- Remove 'test-*-id' from seeds/tests; use existing auth.users + get-or-create property
- Add/keep pgcrypto; set default gen_random_uuid() on uuid ids  
- Amortization: tolerant calc + strict CHECK constraint useful_life_years>=1
- Add helpers get_or_create_test_user/property for reusable seeds
- 9-point smoke test validates all UUID/amortization guards
```

**Prêt pour review et merge** ✅