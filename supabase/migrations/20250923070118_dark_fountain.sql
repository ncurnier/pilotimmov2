-- Script de smoke test - SQL pur compatible Postgres/Supabase
-- Vérifie que toutes les corrections UUID et amortization fonctionnent

-- Test 1: Vérifier l'extension pgcrypto
SELECT 'Test 1: Extension pgcrypto' as test_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')
            THEN '✅ PASS'
            ELSE '❌ FAIL - pgcrypto non activée'
       END as result;

-- Test 2: Vérifier la génération UUID
SELECT 'Test 2: Génération UUID' as test_name,
       CASE WHEN gen_random_uuid() IS NOT NULL
            THEN '✅ PASS'
            ELSE '❌ FAIL - gen_random_uuid() ne fonctionne pas'
       END as result;

-- Test 3: Vérifier les DEFAULT des colonnes id
SELECT 'Test 3: DEFAULT des colonnes id' as test_name,
       CASE WHEN COUNT(*) = 0
            THEN '✅ PASS - Aucun DEFAULT uid() trouvé'
            ELSE '❌ FAIL - ' || COUNT(*) || ' colonnes avec DEFAULT uid()'
       END as result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'id'
  AND data_type = 'uuid'
  AND column_default LIKE '%uid()%';

-- Test 4: Vérifier l'absence de uid() problématique
SELECT 'Test 4: Fonctions uid() problématiques' as test_name,
       CASE WHEN NOT EXISTS (
         SELECT 1 FROM pg_proc 
         WHERE proname = 'uid' 
           AND pronargs = 0
           AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
       )
       THEN '✅ PASS - Aucune fonction uid() problématique'
       ELSE '❌ FAIL - Fonction uid() trouvée'
       END as result;

-- Test 5: Contrainte useful_life_years
SELECT 'Test 5: Contrainte useful_life_years >= 1' as test_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_constraint c
         JOIN pg_class t ON c.conrelid = t.oid
         WHERE t.relname = 'amortizations'
           AND c.contype = 'c'
           AND pg_get_constraintdef(c.oid) LIKE '%useful_life_years%>=%1%'
       )
       THEN '✅ PASS'
       ELSE '❌ FAIL - Contrainte useful_life_years manquante'
       END as result;

-- Test 6: Tentative d'insertion avec useful_life_years = 0 (doit échouer)
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
  constraint_violated boolean := false;
BEGIN
  -- Obtenir des IDs valides
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  IF test_user_id IS NULL THEN
    -- Créer un utilisateur de test si nécessaire
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (gen_random_uuid(), 'smoke-test@example.com', 'encrypted', now(), now(), now())
    RETURNING id INTO test_user_id;
  END IF;

  -- Obtenir une propriété
  SELECT id INTO test_property_id 
  FROM (
    SELECT id FROM public.properties WHERE user_id = test_user_id
    UNION ALL
    SELECT id FROM public.biens WHERE user_id = test_user_id
    UNION ALL  
    SELECT id FROM public.lmnp_biens WHERE user_id = test_user_id
  ) t LIMIT 1;

  IF test_property_id IS NULL THEN
    -- Créer une propriété de test
    INSERT INTO public.properties (id, user_id, address, start_date, monthly_rent, status)
    VALUES (gen_random_uuid(), test_user_id, 'Test Property', CURRENT_DATE, 1000, 'active')
    RETURNING id INTO test_property_id;
  END IF;

  -- Tenter l'insertion avec useful_life_years = 0
  BEGIN
    INSERT INTO public.amortizations (
      user_id, property_id, item_name, category,
      purchase_date, purchase_amount, useful_life_years
    ) VALUES (
      test_user_id, test_property_id, 'Test Invalid Years',
      'mobilier', CURRENT_DATE, 1000, 0
    );
  EXCEPTION
    WHEN check_violation THEN
      constraint_violated := true;
  END;

  -- Nettoyer
  DELETE FROM public.amortizations 
  WHERE item_name = 'Test Invalid Years';

  -- Rapporter le résultat
  INSERT INTO temp_test_results (test_name, result) VALUES (
    'Test 6: Rejet useful_life_years = 0',
    CASE WHEN constraint_violated 
         THEN '✅ PASS - Contrainte respectée'
         ELSE '❌ FAIL - Contrainte non respectée'
    END
  );
END;
$$;

-- Table temporaire pour les résultats de test
CREATE TEMP TABLE temp_test_results (test_name text, result text);

-- Test 7: Insertion valide avec useful_life_years = 10
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
  inserted_id uuid;
  success boolean := false;
BEGIN
  -- Obtenir des IDs valides (réutiliser la logique du test 6)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  SELECT id INTO test_property_id 
  FROM (
    SELECT id FROM public.properties WHERE user_id = test_user_id
    UNION ALL
    SELECT id FROM public.biens WHERE user_id = test_user_id  
    UNION ALL
    SELECT id FROM public.lmnp_biens WHERE user_id = test_user_id
  ) t LIMIT 1;

  -- Insertion valide
  INSERT INTO public.amortizations (
    user_id, property_id, item_name, category,
    purchase_date, purchase_amount, useful_life_years
  ) VALUES (
    test_user_id, test_property_id, 'Test Valid Years',
    'mobilier', CURRENT_DATE, 1000, 10
  ) RETURNING id INTO inserted_id;

  success := (inserted_id IS NOT NULL);

  -- Nettoyer
  DELETE FROM public.amortizations WHERE id = inserted_id;

  INSERT INTO temp_test_results (test_name, result) VALUES (
    'Test 7: Insertion valide years = 10',
    CASE WHEN success 
         THEN '✅ PASS'
         ELSE '❌ FAIL'
    END
  );
END;
$$;

-- Test 8: Auto-génération UUID sur INSERT
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
  auto_generated_id uuid;
  success boolean := false;
BEGIN
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  SELECT id INTO test_property_id 
  FROM (
    SELECT id FROM public.properties WHERE user_id = test_user_id
    UNION ALL
    SELECT id FROM public.biens WHERE user_id = test_user_id
    UNION ALL  
    SELECT id FROM public.lmnp_biens WHERE user_id = test_user_id
  ) t LIMIT 1;

  -- Insert sans spécifier l'id (doit être auto-généré)
  INSERT INTO public.amortizations (
    user_id, property_id, item_name, category,
    purchase_date, purchase_amount, useful_life_years
  ) VALUES (
    test_user_id, test_property_id, 'Test Auto UUID',
    'mobilier', CURRENT_DATE, 1000, 10
  ) RETURNING id INTO auto_generated_id;

  success := (auto_generated_id IS NOT NULL);

  -- Nettoyer
  DELETE FROM public.amortizations WHERE id = auto_generated_id;

  INSERT INTO temp_test_results (test_name, result) VALUES (
    'Test 8: Auto-génération UUID',
    CASE WHEN success 
         THEN '✅ PASS'
         ELSE '❌ FAIL'
    END
  );
END;
$$;

-- Test 9: Vérifier qu'aucune donnée invalide ne subsiste
SELECT 'Test 9: Nettoyage données invalides' as test_name,
       CASE WHEN (
         SELECT COUNT(*) FROM public.users WHERE user_id ~ '^test-'
       ) = 0
       THEN '✅ PASS - Aucune donnée invalide'
       ELSE '❌ FAIL - Données invalides trouvées'
       END as result;

-- Afficher tous les résultats
SELECT * FROM temp_test_results
UNION ALL
SELECT test_name, result FROM (VALUES
  ('Test 1: Extension pgcrypto', 
   CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')
        THEN '✅ PASS' ELSE '❌ FAIL' END),
  ('Test 2: Génération UUID',
   CASE WHEN gen_random_uuid() IS NOT NULL 
        THEN '✅ PASS' ELSE '❌ FAIL' END),
  ('Test 9: Nettoyage données invalides',
   CASE WHEN COALESCE((SELECT COUNT(*) FROM public.users WHERE user_id ~ '^test-'), 0) = 0
        THEN '✅ PASS' ELSE '❌ FAIL' END)
) AS static_tests(test_name, result)
ORDER BY test_name;

-- Nettoyage final
DROP TABLE IF EXISTS temp_test_results;

-- Message de fin
SELECT '🎉 Smoke test terminé - Vérifiez les résultats ci-dessus' as message;