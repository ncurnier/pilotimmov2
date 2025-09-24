# 🏠 Compatibilité Properties - Suppression des références owner_id

## 📋 Résumé des corrections appliquées

Cette migration corrige définitivement les problèmes de compatibilité avec la table `public.properties` en supprimant toutes les références à `owner_id` et en standardisant sur `user_id`.

## 🔍 Problèmes résolus

### A. Références owner_id obsolètes ✅
- **Helpers SQL** → Plus de recherche dans `lmnp_biens` ou `biens`
- **Seeds** → Utilisation exclusive de `public.properties`
- **RLS policies** → Basées sur `properties.user_id` existant
- **App TypeScript** → Suppression des références `owner_id`

### B. Table properties standardisée ✅
- **Colonne created_by** → Ajoutée pour compatibilité future
- **Backfill automatique** → `created_by = user_id` pour données existantes
- **RLS amortizations** → Basé sur `properties.user_id` via JOIN
- **Validation côté client** → Vérification accès propriété avant création

### C. Seeds et tests corrigés ✅
- **UUID réels uniquement** → Plus de strings `'test-*-id'`
- **Table properties** → Création minimaliste (address, user_id, monthly_rent)
- **Helpers robustes** → Auto-détection et gestion d'erreur gracieuse
- **Nettoyage automatique** → Suppression des données invalides

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers
```
supabase/migrations/20250125000005_fix_properties_compatibility.sql  # Migration complète
sql/smoke_properties_compatibility.sql                               # Tests de validation
scripts/test-sql.sh                                                  # Script de test amélioré
PROPERTIES_COMPATIBILITY_SUMMARY.md                                  # Ce résumé
```

### Fichiers modifiés
```
src/services/supabase/amortizations.ts    # Validation property_id + accès
src/services/supabase/properties.ts       # Ajout created_by automatique
src/services/supabase/types.ts            # Type Property avec created_by
src/components/AmortissementsPage.tsx     # Meilleure gestion erreurs
src/components/PropertiesPage.tsx         # Injection created_by
src/hooks/usePropertyContext.ts           # Suppression owner_id automatique
```

## 🧪 Tests automatisés

### Smoke test (sql/smoke_properties_compatibility.sql)
1. ✅ Table `public.properties` avec `user_id` existe
2. ✅ Colonne `created_by` ajoutée et backfillée
3. ✅ Policies RLS amortizations via properties actives
4. ✅ Création property + amortization sans `owner_id`
5. ✅ Calculs automatiques fonctionnels
6. ✅ Nettoyage des données de test

### Script de test (scripts/test-sql.sh)
- Validation de `DATABASE_URL`
- Exécution avec `ON_ERROR_STOP=1`
- Logs détaillés et gestion d'erreur

## 🚀 Déploiement

### Ordre d'exécution
```bash
# 1. Appliquer la migration
supabase db push

# 2. Exécuter le smoke test
npm run test:sql

# 3. Vérifier l'app
npm run dev
```

### Commandes Supabase
```bash
# Test sur base vierge
supabase db reset

# Validation complète
supabase db push && npm run test:sql
```

## 🔄 Architecture finale

### Contrôle d'accès
- **Properties** : `user_id` (propriétaire) + `created_by` (créateur)
- **Amortizations** : RLS via JOIN avec `properties.user_id`
- **Pas de table property_members** : solution simple avec colonnes existantes

### Flux de création
1. **Propriété** : `user_id` + `created_by` automatiques
2. **Amortissement** : `property_id` injecté via Property Context
3. **Validation** : Vérification accès propriété côté client + RLS
4. **Calculs** : Triggers automatiques (annual_amortization, remaining_value)

### Sécurité
- **RLS strict** : Utilisateur ne voit que ses propriétés
- **Validation côté client** : Vérification accès avant création
- **Contraintes DB** : `useful_life_years >= 1`, montants positifs
- **Nettoyage automatique** : Suppression données invalides

## 🎯 Critères d'acceptation validés

- ✅ Plus aucune référence à `owner_id` dans le code
- ✅ Plus de recherche dans `lmnp_biens` ou `biens`
- ✅ `supabase db reset` passe sur base vierge
- ✅ Seeds utilisent exclusivement `public.properties`
- ✅ RLS amortizations basé sur `properties.user_id`
- ✅ App fonctionne avec Property Context sans `owner_id`

## 🔒 Sécurité & Qualité

- ✅ **RLS strict** : Accès basé sur `properties.user_id`
- ✅ **Validation côté client** : Vérification accès propriété
- ✅ **Contraintes DB** : Empêchent les données invalides
- ✅ **Nettoyage automatique** : Suppression données corrompues
- ✅ **Helpers robustes** : Gestion d'erreur gracieuse

## 📊 Performance

- ✅ **RLS optimisé** : JOIN avec index sur `properties.user_id`
- ✅ **Index property_id** : Requêtes amortizations rapides
- ✅ **Pas de table supplémentaire** : Solution simple et efficace
- ✅ **Helpers réutilisables** : Fonctions SQL pour futurs seeds

## 🧹 Challenge évité définitivement

- ❌ **Plus jamais** de références `owner_id` dans le code
- ❌ **Plus jamais** de recherche dans `lmnp_biens`/`biens`
- ❌ **Plus jamais** de seeds avec UUID string invalides
- ❌ **Plus jamais** de RLS basé sur colonnes inexistantes
- ✅ **Architecture simple** : `public.properties` + `user_id` + RLS

## 📞 Support

En cas de problème :
1. Exécuter le smoke test : `npm run test:sql`
2. Vérifier les logs de migration dans Supabase Dashboard
3. Contrôler que `properties.user_id` et `created_by` existent
4. Vérifier les policies RLS : `SELECT * FROM pg_policies WHERE tablename='amortizations';`

---

**Message de commit suggéré :**
```
fix(properties): remove owner_id references; standardize on public.properties with user_id + created_by; fix RLS amortizations via properties JOIN

- Remove all owner_id/lmnp_biens references from helpers, seeds, app
- Add created_by column to properties (backfilled from user_id)
- Fix RLS policies amortizations: JOIN with properties.user_id instead of direct user_id
- Update amortization service: validate property access before creation
- Clean invalid data: remove test-*-id strings, use real UUIDs only
- Add smoke test: properties + amortizations creation without owner_id
```

**Prêt pour review et merge** ✅