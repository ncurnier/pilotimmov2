/*
  # Script de test des migrations LMNP
  
  Ce script teste toutes les fonctionnalités après migration :
  - Extensions et fonctions
  - Tables et contraintes
  - RLS et policies
  - Triggers et calculs automatiques
  - Performances des index
*/

-- Test 1: Vérification des extensions
SELECT 
  extname as extension_name,
  extversion as version
FROM pg_extension 
WHERE extname IN ('pgcrypto', 'uuid-ossp');

-- Test 2: Vérification des tables principales
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('users', 'properties', 'revenues', 'expenses', 'declarations', 'notifications', 'tenants', 'amortizations')
ORDER BY tablename;

-- Test 3: Vérification des policies RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  roles
FROM pg_policies 
WHERE tablename IN ('users', 'properties', 'revenues', 'expenses', 'declarations', 'notifications', 'tenants', 'amortizations')
ORDER BY tablename, policyname;

-- Test 4: Test d'insertion dans amortizations (nécessite des UUIDs valides)
-- Note: Remplacer les UUIDs par des valeurs réelles lors du test
DO $$
DECLARE
  test_user_id text := 'test-user-123';
  test_property_id uuid;
  test_amortization_id uuid;
  calculated_annual numeric;
  calculated_remaining numeric;
BEGIN
  -- Créer une propriété de test (si elle n'existe pas)
  INSERT INTO properties (user_id, address, monthly_rent, start_date)
  VALUES (test_user_id, 'Test Property for Amortization', 1000, CURRENT_DATE)
  ON CONFLICT DO NOTHING
  RETURNING id INTO test_property_id;
  
  -- Si pas de retour, récupérer l'ID existant
  IF test_property_id IS NULL THEN
    SELECT id INTO test_property_id 
    FROM properties 
    WHERE user_id = test_user_id 
    LIMIT 1;
  END IF;
  
  -- Test d'insertion d'amortissement
  INSERT INTO amortizations (
    user_id,
    property_id,
    item_name,
    category,
    purchase_date,
    purchase_amount,
    useful_life_years,
    accumulated_amortization
  ) VALUES (
    test_user_id,
    test_property_id,
    'Réfrigérateur Samsung Test',
    'electromenager',
    CURRENT_DATE,
    1200.00,
    5,
    0
  ) RETURNING id, annual_amortization, remaining_value 
  INTO test_amortization_id, calculated_annual, calculated_remaining;
  
  -- Vérifier les calculs
  RAISE NOTICE 'Test amortization created with ID: %', test_amortization_id;
  RAISE NOTICE 'Annual amortization calculated: % (expected: 240.00)', calculated_annual;
  RAISE NOTICE 'Remaining value calculated: % (expected: 1200.00)', calculated_remaining;
  
  -- Test de mise à jour
  UPDATE amortizations 
  SET accumulated_amortization = 240.00
  WHERE id = test_amortization_id;
  
  -- Vérifier la mise à jour
  SELECT remaining_value INTO calculated_remaining
  FROM amortizations 
  WHERE id = test_amortization_id;
  
  RAISE NOTICE 'After update - Remaining value: % (expected: 960.00)', calculated_remaining;
  
  -- Nettoyer les données de test
  DELETE FROM amortizations WHERE id = test_amortization_id;
  DELETE FROM properties WHERE id = test_property_id;
  
  RAISE NOTICE 'Test completed successfully!';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test failed with error: %', SQLERRM;
END $$;

-- Test 5: Performance des index critiques
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM amortizations 
WHERE user_id = 'test-user' AND property_id = gen_random_uuid();

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM tenants 
WHERE user_id = 'test-user' AND status = 'active';

-- Test 6: Vérification des triggers updated_at
DO $$
DECLARE
  test_user_id text := 'test-user-trigger';
  test_property_id uuid;
  old_updated_at timestamptz;
  new_updated_at timestamptz;
BEGIN
  -- Créer une propriété de test
  INSERT INTO properties (user_id, address, monthly_rent, start_date)
  VALUES (test_user_id, 'Test Property for Trigger', 1000, CURRENT_DATE)
  RETURNING id INTO test_property_id;
  
  -- Insérer un locataire
  INSERT INTO tenants (user_id, property_id, first_name, last_name, monthly_rent)
  VALUES (test_user_id, test_property_id, 'John', 'Doe', 800);
  
  -- Récupérer updated_at initial
  SELECT updated_at INTO old_updated_at
  FROM tenants 
  WHERE user_id = test_user_id;
  
  -- Attendre un peu et faire une mise à jour
  PERFORM pg_sleep(1);
  
  UPDATE tenants 
  SET monthly_rent = 850
  WHERE user_id = test_user_id;
  
  -- Récupérer nouveau updated_at
  SELECT updated_at INTO new_updated_at
  FROM tenants 
  WHERE user_id = test_user_id;
  
  -- Vérifier que updated_at a changé
  IF new_updated_at > old_updated_at THEN
    RAISE NOTICE 'Trigger updated_at works correctly!';
  ELSE
    RAISE NOTICE 'ERROR: Trigger updated_at not working!';
  END IF;
  
  -- Nettoyer
  DELETE FROM tenants WHERE user_id = test_user_id;
  DELETE FROM properties WHERE id = test_property_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Trigger test failed: %', SQLERRM;
END $$;

-- Test 7: Vérification des contraintes
DO $$
BEGIN
  -- Test contrainte montant négatif (doit échouer)
  BEGIN
    INSERT INTO amortizations (user_id, property_id, item_name, purchase_amount)
    VALUES ('test', gen_random_uuid(), 'Test', -100);
    RAISE NOTICE 'ERROR: Negative amount constraint not working!';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Negative amount constraint works correctly!';
  END;
  
  -- Test contrainte durée zéro (doit échouer)
  BEGIN
    INSERT INTO amortizations (user_id, property_id, item_name, useful_life_years)
    VALUES ('test', gen_random_uuid(), 'Test', 0);
    RAISE NOTICE 'ERROR: Zero duration constraint not working!';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Zero duration constraint works correctly!';
  END;
END $$;