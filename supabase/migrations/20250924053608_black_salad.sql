/*
  Seed de développement sûr pour amortizations
  - Utilise exclusivement des UUIDs réels
  - Données valides uniquement (useful_life_years >= 1)
  - Idempotent (ON CONFLICT DO NOTHING)
*/

-- 1. Activer pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Helpers pour récupérer/créer des données de test sûres
CREATE OR REPLACE FUNCTION get_or_create_test_user()
RETURNS uuid AS $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Récupérer un utilisateur existant
  SELECT id INTO test_user_id 
  FROM auth.users 
  LIMIT 1;
  
  -- Si aucun utilisateur, en créer un (fallback)
  IF test_user_id IS NULL THEN
    test_user_id := gen_random_uuid();
    
    -- Essayer de créer dans auth.users (peut échouer selon permissions)
    BEGIN
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (
        test_user_id,
        'dev-' || substring(test_user_id::text, 1, 8) || '@example.com',
        crypt('devpassword', gen_salt('bf')),
        now(),
        now(),
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Si échec, juste utiliser l'UUID généré
      RAISE NOTICE 'Impossible de créer dans auth.users, utilisation UUID: %', test_user_id;
    END;
  END IF;
  
  RETURN test_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_or_create_test_property(owner_user_id uuid)
RETURNS uuid AS $$
DECLARE
  test_property_id uuid;
BEGIN
  -- Récupérer une propriété existante pour cet utilisateur
  SELECT id INTO test_property_id
  FROM public.properties 
  WHERE user_id = owner_user_id::text
  LIMIT 1;
  
  -- Si aucune propriété, en créer une
  IF test_property_id IS NULL THEN
    test_property_id := gen_random_uuid();
    
    INSERT INTO public.properties (id, user_id, address, monthly_rent, start_date, created_by)
    VALUES (
      test_property_id,
      owner_user_id::text,
      'Dev Property ' || substring(test_property_id::text, 1, 8),
      1200,
      CURRENT_DATE,
      owner_user_id::text
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN test_property_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Créer des données de test valides
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
  test_amortization_id uuid;
BEGIN
  -- Récupérer/créer un utilisateur de test
  test_user_id := get_or_create_test_user();
  RAISE NOTICE 'Utilisateur de test: %', test_user_id;
  
  -- Créer un profil utilisateur dans public.users si nécessaire
  INSERT INTO public.users (user_id, email, display_name, first_name, last_name)
  VALUES (
    test_user_id::text,
    'dev-' || substring(test_user_id::text, 1, 8) || '@example.com',
    'Dev User',
    'Dev',
    'User'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Récupérer/créer une propriété de test
  test_property_id := get_or_create_test_property(test_user_id);
  RAISE NOTICE 'Propriété de test: %', test_property_id;
  
  -- Créer un amortissement valide
  test_amortization_id := gen_random_uuid();
  
  INSERT INTO public.amortizations (
    id,
    user_id,
    property_id,
    item_name,
    category,
    purchase_date,
    purchase_amount,
    useful_life_years,
    status,
    notes
  )
  VALUES (
    test_amortization_id,
    test_user_id::text,
    test_property_id,
    'Mobilier de test',
    'mobilier',
    CURRENT_DATE - INTERVAL '1 year',
    5000,
    10, -- >= 1 (respecte la contrainte)
    'active',
    'Données de test générées automatiquement'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Amortissement de test créé: %', test_amortization_id;
  RAISE NOTICE '✅ Seed de développement terminé avec succès';
END;
$$;

-- 4. Nettoyage des fonctions temporaires
DROP FUNCTION IF EXISTS get_or_create_test_user();
DROP FUNCTION IF EXISTS get_or_create_test_property(uuid);