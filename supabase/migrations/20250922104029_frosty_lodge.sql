/*
  # Tests - Correction division par zéro amortissements

  Tests de validation pour :
  1. Contraintes CHECK
  2. Fonction amortization_annual
  3. Trigger de calcul
  4. Cas limites et erreurs
*/

-- Préparer une propriété de test valide (UUID déterministe)
INSERT INTO properties (
  id,
  user_id,
  address,
  start_date,
  monthly_rent,
  status,
  type
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-user-id',
  'Test property for amortization checks',
  CURRENT_DATE,
  0,
  'active',
  'apartment'
)
ON CONFLICT (id) DO NOTHING;

-- Test 1: Vérification des fonctions
SELECT 'Test 1: Fonction amortization_annual' as test_name;

-- Test avec years = 0 (doit retourner NULL)
SELECT 
  'years=0' as case_name,
  amortization_annual(1000, 0, 0) as result,
  'NULL attendu' as expected;

-- Test avec years négatif (doit retourner NULL)
SELECT 
  'years<0' as case_name,
  amortization_annual(1000, 0, -5) as result,
  'NULL attendu' as expected;

-- Test avec years = 10 (doit retourner 100.00)
SELECT 
  'years=10' as case_name,
  amortization_annual(1000, 0, 10) as result,
  '100.00 attendu' as expected;

-- Test avec salvage_value
SELECT 
  'avec salvage' as case_name,
  amortization_annual(1000, 200, 10) as result,
  '80.00 attendu' as expected;

-- Test avec base_amount négatif (doit retourner NULL)
SELECT 
  'base<0' as case_name,
  amortization_annual(-1000, 0, 10) as result,
  'NULL attendu' as expected;

-- Test 2: Insertion avec years = 0 (doit échouer avec contrainte CHECK)
SELECT 'Test 2: Contrainte CHECK years > 0' as test_name;

DO $$
BEGIN
  BEGIN
    INSERT INTO amortizations (
      user_id, property_id, item_name, category,
      purchase_date, purchase_amount, useful_life_years
    ) VALUES (
      'test-user-id', '00000000-0000-0000-0000-000000000001', 'Test Item', 'mobilier',
      CURRENT_DATE, 1000, 0
    );
    RAISE NOTICE 'ERREUR: Insertion avec years=0 devrait échouer';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK: Contrainte CHECK empêche years=0';
  END;
END $$;

-- Test 3: Insertion valide avec years = 10
SELECT 'Test 3: Insertion valide' as test_name;

-- Nettoyer les données de test précédentes
DELETE FROM amortizations WHERE item_name LIKE 'Test Item%';

-- Insérer un test valide
INSERT INTO amortizations (
  user_id, property_id, item_name, category,
  purchase_date, purchase_amount, useful_life_years,
  accumulated_amortization, status
) VALUES (
  'test-user-id', '00000000-0000-0000-0000-000000000001', 'Test Item Valid', 'mobilier',
  CURRENT_DATE, 1000, 10, 0, 'active'
) RETURNING 
  item_name,
  purchase_amount,
  useful_life_years,
  annual_amortization,
  remaining_value;

-- Test 4: Vérification des calculs
SELECT 'Test 4: Vérification des calculs' as test_name;

SELECT 
  item_name,
  purchase_amount,
  useful_life_years,
  annual_amortization,
  accumulated_amortization,
  remaining_value,
  -- Vérifications
  CASE 
    WHEN annual_amortization = ROUND(purchase_amount / useful_life_years, 2) 
    THEN 'OK' 
    ELSE 'ERREUR' 
  END as annual_check,
  CASE 
    WHEN remaining_value = purchase_amount - accumulated_amortization 
    THEN 'OK' 
    ELSE 'ERREUR' 
  END as remaining_check
FROM amortizations 
WHERE item_name = 'Test Item Valid';

-- Test 5: Test du trigger sur UPDATE
SELECT 'Test 5: Trigger sur UPDATE' as test_name;

UPDATE amortizations 
SET 
  purchase_amount = 2000,
  useful_life_years = 5,
  accumulated_amortization = 400
WHERE item_name = 'Test Item Valid'
RETURNING 
  item_name,
  purchase_amount,
  useful_life_years,
  annual_amortization,
  remaining_value;

-- Test 6: Test avec accumulated_amortization > purchase_amount (doit échouer)
SELECT 'Test 6: Contrainte accumulated <= purchase' as test_name;

DO $$
BEGIN
  BEGIN
    UPDATE amortizations 
    SET accumulated_amortization = 3000
    WHERE item_name = 'Test Item Valid';
    RAISE NOTICE 'ERREUR: accumulated > purchase devrait échouer';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK: Contrainte empêche accumulated > purchase';
  END;
END $$;

-- Test 7: Vérification des contraintes existantes
SELECT 'Test 7: Vérification des contraintes' as test_name;

SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE 'amortizations_%'
ORDER BY constraint_name;

-- Test 8: Performance des index
SELECT 'Test 8: Vérification des index' as test_name;

SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'amortizations'
ORDER BY indexname;

-- Test 9: Test des durées LMNP réglementaires
SELECT 'Test 9: Durées LMNP réglementaires' as test_name;

-- Insérer des exemples pour chaque catégorie
INSERT INTO amortizations (
  user_id, property_id, item_name, category,
  purchase_date, purchase_amount, useful_life_years, status
) VALUES 
  ('test-user-id', '00000000-0000-0000-0000-000000000001', 'Canapé', 'mobilier', CURRENT_DATE, 800, 10, 'active'),
  ('test-user-id', '00000000-0000-0000-0000-000000000001', 'Réfrigérateur', 'electromenager', CURRENT_DATE, 600, 5, 'active'),
  ('test-user-id', '00000000-0000-0000-0000-000000000001', 'Ordinateur', 'informatique', CURRENT_DATE, 1200, 3, 'active'),
  ('test-user-id', '00000000-0000-0000-0000-000000000001', 'Cuisine équipée', 'amenagement', CURRENT_DATE, 5000, 15, 'active'),
  ('test-user-id', '00000000-0000-0000-0000-000000000001', 'Rénovation salle de bain', 'travaux', CURRENT_DATE, 8000, 20, 'active')
ON CONFLICT DO NOTHING;

-- Vérifier les calculs pour chaque catégorie
SELECT 
  category,
  item_name,
  purchase_amount,
  useful_life_years,
  annual_amortization,
  ROUND(purchase_amount / useful_life_years, 2) as expected_annual
FROM amortizations 
WHERE item_name IN ('Canapé', 'Réfrigérateur', 'Ordinateur', 'Cuisine équipée', 'Rénovation salle de bain')
ORDER BY category, item_name;

-- Nettoyage des données de test
DELETE FROM amortizations WHERE user_id = 'test-user-id';
DELETE FROM properties WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT 'Tests terminés avec succès!' as final_result;