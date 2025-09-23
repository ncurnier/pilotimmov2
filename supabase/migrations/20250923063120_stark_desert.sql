/*
  # Script de test UUID - Validation post-migration
  
  Ce script valide que :
  1. L'extension pgcrypto est active
  2. gen_random_uuid() fonctionne correctement
  3. Les tables génèrent bien des UUID automatiquement
  4. Les policies RLS utilisant auth.uid() sont intactes
  5. Aucune fonction uid() problématique ne subsiste
*/

-- Configuration pour les tests
\set ON_ERROR_STOP on
\timing on

-- Header du test
SELECT 
  '=== SMOKE TEST UUID - ' || now()::timestamp(0) || ' ===' as test_header;

-- Test 1: Vérification de l'extension pgcrypto
SELECT 
  '1. Test extension pgcrypto' as test_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') 
    THEN '✅ PASS - Extension pgcrypto active'
    ELSE '❌ FAIL - Extension pgcrypto manquante'
  END as result;

-- Test 2: Génération UUID directe
SELECT 
  '2. Test génération UUID directe' as test_name,
  CASE 
    WHEN gen_random_uuid() IS NOT NULL 
    THEN '✅ PASS - gen_random_uuid() fonctionne'
    ELSE '❌ FAIL - gen_random_uuid() ne fonctionne pas'
  END as result,
  gen_random_uuid() as sample_uuid;

-- Test 3: Vérification des DEFAULT sur les tables principales
WITH table_defaults AS (
  SELECT 
    table_name,
    column_name,
    column_default,
    CASE 
      WHEN column_default LIKE '%gen_random_uuid()%' THEN 'gen_random_uuid'
      WHEN column_default LIKE '%uid()%' THEN 'uid() - PROBLÈME'
      WHEN column_default IS NULL THEN 'NULL'
      ELSE 'autre'
    END as default_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND column_name = 'id'
  AND data_type = 'uuid'
  ORDER BY table_name
)
SELECT 
  '3. Test DEFAULT des colonnes id' as test_name,
  table_name,
  default_type,
  CASE 
    WHEN default_type = 'gen_random_uuid' THEN '✅ PASS'
    WHEN default_type = 'uid() - PROBLÈME' THEN '❌ FAIL'
    ELSE '⚠️  WARN'
  END as status
FROM table_defaults;

-- Test 4: Test d'insertion sur les tables principales (si elles existent)
DO $$
DECLARE
  test_user_id text := 'smoke-test-' || extract(epoch from now())::text;
  property_uuid uuid;
  revenue_uuid uuid;
  expense_uuid uuid;
BEGIN
  RAISE NOTICE '4. Test insertions avec génération UUID automatique';
  
  -- Test sur users (si la table existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    BEGIN
      INSERT INTO users (user_id, email, display_name)
      VALUES (test_user_id, 'smoke-test@example.com', 'Smoke Test User')
      RETURNING id INTO property_uuid;
      
      RAISE NOTICE '✅ PASS - Table users: UUID généré = %', property_uuid;
      
      -- Nettoyage
      DELETE FROM users WHERE user_id = test_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ FAIL - Table users: %', SQLERRM;
    END;
  END IF;
  
  -- Test sur properties (si la table existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
    BEGIN
      INSERT INTO properties (user_id, address, monthly_rent)
      VALUES (test_user_id, 'Test Address', 1000)
      RETURNING id INTO property_uuid;
      
      RAISE NOTICE '✅ PASS - Table properties: UUID généré = %', property_uuid;
      
      -- Test sur revenues (si la table existe et a property_id)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenues') THEN
        BEGIN
          INSERT INTO revenues (user_id, property_id, amount, description, type)
          VALUES (test_user_id, property_uuid, 1000, 'Test Revenue', 'rent')
          RETURNING id INTO revenue_uuid;
          
          RAISE NOTICE '✅ PASS - Table revenues: UUID généré = %', revenue_uuid;
          
          -- Nettoyage revenues
          DELETE FROM revenues WHERE id = revenue_uuid;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE '❌ FAIL - Table revenues: %', SQLERRM;
        END;
      END IF;
      
      -- Test sur expenses (si la table existe et a property_id)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        BEGIN
          INSERT INTO expenses (user_id, property_id, amount, description, category)
          VALUES (test_user_id, property_uuid, 500, 'Test Expense', 'maintenance')
          RETURNING id INTO expense_uuid;
          
          RAISE NOTICE '✅ PASS - Table expenses: UUID généré = %', expense_uuid;
          
          -- Nettoyage expenses
          DELETE FROM expenses WHERE id = expense_uuid;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE '❌ FAIL - Table expenses: %', SQLERRM;
        END;
      END IF;
      
      -- Nettoyage properties
      DELETE FROM properties WHERE id = property_uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ FAIL - Table properties: %', SQLERRM;
    END;
  END IF;
END $$;

-- Test 5: Vérification des policies RLS avec auth.uid()
WITH rls_policies AS (
  SELECT 
    schemaname,
    tablename,
    policyname,
    CASE 
      WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN true
      ELSE false
    END as uses_auth_uid
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT 
  '5. Test policies RLS auth.uid()' as test_name,
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE uses_auth_uid) as auth_uid_policies,
  CASE 
    WHEN COUNT(*) FILTER (WHERE uses_auth_uid) > 0 
    THEN '✅ PASS - Policies RLS préservées'
    ELSE '⚠️  WARN - Aucune policy auth.uid() trouvée'
  END as status
FROM rls_policies;

-- Test 6: Recherche de fonctions uid() problématiques
WITH problematic_functions AS (
  SELECT 
    routine_name,
    routine_type,
    CASE 
      WHEN routine_definition LIKE '%uid()%' AND routine_definition NOT LIKE '%auth.uid()%' 
      THEN true
      ELSE false
    END as has_problematic_uid
  FROM information_schema.routines
  WHERE routine_schema = 'public'
)
SELECT 
  '6. Test fonctions uid() problématiques' as test_name,
  COUNT(*) FILTER (WHERE has_problematic_uid) as problematic_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE has_problematic_uid) = 0 
    THEN '✅ PASS - Aucune fonction uid() problématique'
    ELSE '❌ FAIL - Fonctions uid() problématiques détectées'
  END as status
FROM problematic_functions;

-- Test 7: Performance de génération UUID (générer 1000 UUIDs)
WITH uuid_generation_test AS (
  SELECT gen_random_uuid() as uuid_val
  FROM generate_series(1, 1000)
)
SELECT 
  '7. Test performance UUID' as test_name,
  COUNT(*) as uuids_generated,
  COUNT(DISTINCT uuid_val) as unique_uuids,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT uuid_val) 
    THEN '✅ PASS - Tous les UUIDs sont uniques'
    ELSE '❌ FAIL - UUIDs dupliqués détectés'
  END as status
FROM uuid_generation_test;

-- Résumé final
SELECT 
  '=== RÉSUMÉ DU SMOKE TEST ===' as summary_header,
  now()::timestamp(0) as test_completed;

-- Instructions pour l'utilisateur
SELECT 
  'Instructions:' as instructions,
  '1. Vérifiez que tous les tests affichent ✅ PASS' as step1,
  '2. Les ⚠️  WARN sont acceptables selon le contexte' as step2,
  '3. Les ❌ FAIL nécessitent une correction' as step3,
  '4. Exécutez ce script après chaque migration' as step4;