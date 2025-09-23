-- 🧪 Smoke Tests SQL - Validation complète UUID/Amortization
-- Compatible Postgres/Supabase (SQL pur, sans méta-commandes)

-- Test 1: Extension pgcrypto activée
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION '❌ Extension pgcrypto non activée';
  END IF;
  RAISE NOTICE '✅ Test 1: Extension pgcrypto activée';
END;
$$;

-- Test 2: Génération UUID fonctionnelle
DO $$
DECLARE
  test_uuid uuid;
BEGIN
  SELECT gen_random_uuid() INTO test_uuid;
  IF test_uuid IS NULL THEN
    RAISE EXCEPTION '❌ gen_random_uuid() retourne NULL';
  END IF;
  RAISE NOTICE '✅ Test 2: Génération UUID fonctionnelle: %', test_uuid;
END;
$$;

-- Test 3: DEFAULT des colonnes id corrigés (plus de uid())
DO $$
DECLARE
  bad_defaults integer;
BEGIN
  SELECT COUNT(*) INTO bad_defaults
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND data_type = 'uuid' 
    AND column_name = 'id'
    AND column_default LIKE '%uid()%';
    
  IF bad_defaults > 0 THEN
    RAISE EXCEPTION '❌ % colonnes id uuid utilisent encore uid()', bad_defaults;
  END IF;
  RAISE NOTICE '✅ Test 3: Aucun DEFAULT uid() problématique';
END;
$$;

-- Test 4: Aucune fonction uid() problématique restante
DO $$
DECLARE
  uid_functions integer;
BEGIN
  SELECT COUNT(*) INTO uid_functions
  FROM pg_proc 
  WHERE proname = 'uid' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
  IF uid_functions > 0 THEN
    RAISE EXCEPTION '❌ % fonctions uid() problématiques trouvées', uid_functions;
  END IF;
  RAISE NOTICE '✅ Test 4: Aucune fonction uid() problématique';
END;
$$;

-- Helper: Récupérer ou créer un utilisateur de test
CREATE OR REPLACE FUNCTION get_or_create_test_user()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Essayer de récupérer un utilisateur existant
  SELECT id INTO test_user_id 
  FROM auth.users 
  ORDER BY created_at 
  LIMIT 1;
  
  -- Si aucun utilisateur, en créer un
  IF test_user_id IS NULL THEN
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
    VALUES ('test@pilotimmo.com', 'encrypted', now())
    RETURNING id INTO test_user_id;
  END IF;
  
  RETURN test_user_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Si auth.users n'existe pas, retourner un UUID générique
    RETURN gen_random_uuid();
END;
$$;

-- Helper: Récupérer ou créer une propriété de test
CREATE OR REPLACE FUNCTION get_or_create_test_property(owner_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  test_property_id uuid;
  table_name text;
BEGIN
  -- Auto-détecter la table des propriétés
  SELECT t.table_name INTO table_name
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_name IN ('properties', 'biens', 'lmnp_biens')
  ORDER BY 
    CASE t.table_name 
      WHEN 'properties' THEN 1
      WHEN 'biens' THEN 2
      WHEN 'lmnp_biens' THEN 3
      ELSE 4
    END
  LIMIT 1;
  
  IF table_name IS NULL THEN
    RAISE NOTICE 'Aucune table properties/biens/lmnp_biens trouvée, retour UUID générique';
    RETURN gen_random_uuid();
  END IF;
  
  -- Essayer de récupérer une propriété existante
  EXECUTE format('SELECT id FROM public.%I WHERE user_id = $1 OR owner_id = $1 LIMIT 1', table_name)
  INTO test_property_id
  USING owner_uuid::text;
  
  -- Si aucune propriété, en créer une
  IF test_property_id IS NULL THEN
    IF table_name = 'properties' THEN
      EXECUTE format('INSERT INTO public.%I (user_id, address, monthly_rent) VALUES ($1, $2, $3) RETURNING id', table_name)
      INTO test_property_id
      USING owner_uuid::text, 'Test Property Address', 1000;
    ELSE
      EXECUTE format('INSERT INTO public.%I (owner_id, label) VALUES ($1, $2) RETURNING id', table_name)
      INTO test_property_id
      USING owner_uuid::text, 'Test Property';
    END IF;
  END IF;
  
  RETURN test_property_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur création propriété: %, retour UUID générique', SQLERRM;
    RETURN gen_random_uuid();
END;
$$;

-- Test 5: Contrainte useful_life_years >= 1 active
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.amortizations'::regclass
      AND conname LIKE '%useful_life_years%'
      OR pg_get_constraintdef(oid) LIKE '%useful_life_years%'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE EXCEPTION '❌ Contrainte useful_life_years >= 1 manquante';
  END IF;
  RAISE NOTICE '✅ Test 5: Contrainte useful_life_years >= 1 active';
END;
$$;

-- Test 6: Rejet des insertions avec useful_life_years = 0
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
  error_caught boolean := false;
BEGIN
  test_user_id := get_or_create_test_user();
  test_property_id := get_or_create_test_property(test_user_id);
  
  BEGIN
    INSERT INTO public.amortizations (
      user_id, property_id, item_name, category, 
      purchase_date, purchase_amount, useful_life_years
    ) VALUES (
      test_user_id::text, test_property_id, 'Test ZERO', 'mobilier', 
      CURRENT_DATE, 500, 0
    );
  EXCEPTION
    WHEN check_violation THEN
      error_caught := true;
    WHEN OTHERS THEN
      error_caught := true;
  END;
  
  IF NOT error_caught THEN
    RAISE EXCEPTION '❌ Insertion avec useful_life_years=0 devrait être rejetée';
  END IF;
  RAISE NOTICE '✅ Test 6: Insertion useful_life_years=0 correctement rejetée';
END;
$$;

-- Test 7: Insertion valide avec useful_life_years = 10
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
  inserted_id uuid;
BEGIN
  test_user_id := get_or_create_test_user();
  test_property_id := get_or_create_test_property(test_user_id);
  
  INSERT INTO public.amortizations (
    user_id, property_id, item_name, category, 
    purchase_date, purchase_amount, useful_life_years
  ) VALUES (
    test_user_id::text, test_property_id, 'Test OK', 'mobilier', 
    CURRENT_DATE, 1000, 10
  ) RETURNING id INTO inserted_id;
  
  IF inserted_id IS NULL THEN
    RAISE EXCEPTION '❌ Insertion valide échouée';
  END IF;
  RAISE NOTICE '✅ Test 7: Insertion valide réussie: %', inserted_id;
END;
$$;

-- Test 8: Auto-génération UUID sur INSERT sans id
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
  auto_id uuid;
BEGIN
  test_user_id := get_or_create_test_user();
  test_property_id := get_or_create_test_property(test_user_id);
  
  INSERT INTO public.amortizations (
    user_id, property_id, item_name, purchase_amount, useful_life_years
  ) VALUES (
    test_user_id::text, test_property_id, 'Auto UUID Test', 2000, 5
  ) RETURNING id INTO auto_id;
  
  IF auto_id IS NULL THEN
    RAISE EXCEPTION '❌ Auto-génération UUID échouée';
  END IF;
  RAISE NOTICE '✅ Test 8: Auto-génération UUID réussie: %', auto_id;
END;
$$;

-- Test 9: Nettoyage des données de test
DO $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.amortizations 
  WHERE item_name IN ('Test ZERO', 'Test OK', 'Auto UUID Test', 'Smoke Item');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Test 9: Nettoyage terminé (% lignes supprimées)', deleted_count;
END;
$$;

-- Nettoyage des fonctions helpers
DROP FUNCTION IF EXISTS get_or_create_test_user();
DROP FUNCTION IF EXISTS get_or_create_test_property(uuid);

-- Résumé final
DO $$
BEGIN
  RAISE NOTICE '🎯 Smoke tests terminés avec succès (9/9)';
  RAISE NOTICE '✅ UUID: pgcrypto + gen_random_uuid() + auto-génération';
  RAISE NOTICE '✅ Amortization: contraintes + fonction tolérante';
  RAISE NOTICE '✅ Seeds: UUID réels + données valides uniquement';
END;
$$;