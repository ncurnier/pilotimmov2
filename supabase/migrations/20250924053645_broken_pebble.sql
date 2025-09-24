/*
  Smoke test - Validation de l'élimination des placeholders
  
  Ce script vérifie que :
  1. Aucun placeholder string n'existe dans les colonnes UUID
  2. Aucun useful_life_years <= 0 dans amortizations
  3. Les contraintes de qualité sont en place
  4. Les fonctions de génération UUID fonctionnent
*/

-- Test 1: Vérifier l'extension pgcrypto
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'Extension pgcrypto non activée';
  END IF;
  RAISE NOTICE '✅ Test 1: Extension pgcrypto activée';
END;
$$;

-- Test 2: Vérifier la génération UUID
DO $$
DECLARE
  test_uuid uuid;
BEGIN
  test_uuid := gen_random_uuid();
  IF test_uuid IS NULL THEN
    RAISE EXCEPTION 'gen_random_uuid() retourne NULL';
  END IF;
  RAISE NOTICE '✅ Test 2: Génération UUID fonctionnelle: %', test_uuid;
END;
$$;

-- Test 3: Vérifier l'absence de placeholders dans toutes les tables
DO $$
DECLARE
  placeholder_count INTEGER := 0;
BEGIN
  -- Compter tous les placeholders dans les colonnes UUID
  SELECT COUNT(*) INTO placeholder_count
  FROM (
    SELECT 1 FROM public.amortizations WHERE user_id::text LIKE '%test-%' OR property_id::text LIKE '%test-%'
    UNION ALL
    SELECT 1 FROM public.revenues WHERE user_id::text LIKE '%test-%' OR property_id::text LIKE '%test-%'
    UNION ALL
    SELECT 1 FROM public.expenses WHERE user_id::text LIKE '%test-%' OR property_id::text LIKE '%test-%'
    UNION ALL
    SELECT 1 FROM public.tenants WHERE user_id::text LIKE '%test-%' OR property_id::text LIKE '%test-%'
    UNION ALL
    SELECT 1 FROM public.properties WHERE user_id::text LIKE '%test-%'
    UNION ALL
    SELECT 1 FROM public.users WHERE user_id::text LIKE '%test-%'
  ) AS placeholders;
  
  IF placeholder_count > 0 THEN
    RAISE EXCEPTION 'Placeholders string détectés: % occurrences', placeholder_count;
  END IF;
  
  RAISE NOTICE '✅ Test 3: Aucun placeholder string détecté';
END;
$$;

-- Test 4: Vérifier l'absence de useful_life_years <= 0
DO $$
DECLARE
  invalid_years_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_years_count
  FROM public.amortizations 
  WHERE useful_life_years <= 0;
  
  IF invalid_years_count > 0 THEN
    RAISE EXCEPTION 'useful_life_years <= 0 détectés: % occurrences', invalid_years_count;
  END IF;
  
  RAISE NOTICE '✅ Test 4: Aucun useful_life_years <= 0 détecté';
END;
$$;

-- Test 5: Vérifier les contraintes de qualité
DO $$
BEGIN
  -- Vérifier la contrainte useful_life_years >= 1
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'amortizations_years_chk' 
    AND conrelid = 'public.amortizations'::regclass
  ) THEN
    RAISE EXCEPTION 'Contrainte amortizations_years_chk manquante';
  END IF;
  
  RAISE NOTICE '✅ Test 5: Contraintes de qualité en place';
END;
$$;

-- Test 6: Tester le rejet de useful_life_years = 0
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
BEGIN
  -- Récupérer des UUIDs réels
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  SELECT id INTO test_property_id FROM public.properties LIMIT 1;
  
  IF test_user_id IS NULL OR test_property_id IS NULL THEN
    RAISE NOTICE '⚠️  Test 6 ignoré: pas de données de test disponibles';
    RETURN;
  END IF;
  
  -- Tenter d'insérer avec useful_life_years = 0 (doit échouer)
  BEGIN
    INSERT INTO public.amortizations (
      user_id, property_id, item_name, category, purchase_date, 
      purchase_amount, useful_life_years, status
    )
    VALUES (
      test_user_id::text, test_property_id, 'Test Invalid', 'mobilier', 
      CURRENT_DATE, 1000, 0, 'active'
    );
    
    -- Si on arrive ici, la contrainte n'a pas fonctionné
    RAISE EXCEPTION 'La contrainte useful_life_years >= 1 n''a pas rejeté la valeur 0';
  EXCEPTION 
    WHEN check_violation THEN
      RAISE NOTICE '✅ Test 6: Contrainte useful_life_years >= 1 fonctionne correctement';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur inattendue lors du test de contrainte: %', SQLERRM;
  END;
END;
$$;

-- Test 7: Tester l'insertion valide
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
  test_amortization_id uuid;
BEGIN
  -- Récupérer des UUIDs réels
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  SELECT id INTO test_property_id FROM public.properties LIMIT 1;
  
  IF test_user_id IS NULL OR test_property_id IS NULL THEN
    RAISE NOTICE '⚠️  Test 7 ignoré: pas de données de test disponibles';
    RETURN;
  END IF;
  
  -- Insérer un amortissement valide
  test_amortization_id := gen_random_uuid();
  
  INSERT INTO public.amortizations (
    id, user_id, property_id, item_name, category, purchase_date, 
    purchase_amount, useful_life_years, status, notes
  )
  VALUES (
    test_amortization_id,
    test_user_id::text,
    test_property_id,
    'Test Valid Equipment',
    'mobilier',
    CURRENT_DATE - INTERVAL '1 year',
    3000,
    10, -- >= 1 (valide)
    'active',
    'Test smoke - données valides'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Test 7: Insertion amortissement valide réussie: %', test_amortization_id;
END;
$$;

-- Test 8: Vérifier l'auto-génération UUID
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
  auto_generated_id uuid;
BEGIN
  -- Récupérer des UUIDs réels
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  SELECT id INTO test_property_id FROM public.properties LIMIT 1;
  
  IF test_user_id IS NULL OR test_property_id IS NULL THEN
    RAISE NOTICE '⚠️  Test 8 ignoré: pas de données de test disponibles';
    RETURN;
  END IF;
  
  -- Insérer sans spécifier d'id (doit être auto-généré)
  INSERT INTO public.amortizations (
    user_id, property_id, item_name, category, purchase_date, 
    purchase_amount, useful_life_years, status
  )
  VALUES (
    test_user_id::text,
    test_property_id,
    'Test Auto UUID',
    'electromenager',
    CURRENT_DATE,
    800,
    5,
    'active'
  )
  RETURNING id INTO auto_generated_id;
  
  IF auto_generated_id IS NULL THEN
    RAISE EXCEPTION 'Auto-génération UUID échouée';
  END IF;
  
  RAISE NOTICE '✅ Test 8: Auto-génération UUID réussie: %', auto_generated_id;
END;
$$;

-- Test 9: Nettoyage des données de test
DO $$
BEGIN
  -- Supprimer les données de test créées
  DELETE FROM public.amortizations 
  WHERE notes LIKE '%Test smoke%' 
     OR item_name LIKE 'Test %';
  
  RAISE NOTICE '✅ Test 9: Nettoyage des données de test terminé';
END;
$$;

-- Résumé final
DO $$
DECLARE
  total_amortizations INTEGER;
  total_properties INTEGER;
  total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_amortizations FROM public.amortizations;
  SELECT COUNT(*) INTO total_properties FROM public.properties;
  SELECT COUNT(*) INTO total_users FROM public.users;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 État final de la base:';
  RAISE NOTICE '   - Amortizations: %', total_amortizations;
  RAISE NOTICE '   - Properties: %', total_properties;
  RAISE NOTICE '   - Users: %', total_users;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Tous les tests de validation sont passés avec succès!';
END;
$$;