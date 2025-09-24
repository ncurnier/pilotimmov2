/*
  # Élimination définitive des placeholders test + garde-fous UUID/amortization

  1. Nettoyage automatique
    - Suppression de toutes les données avec 'test-user-id' ou 'test-property-id'
    - Suppression des amortizations avec useful_life_years <= 0
    - Activation de pgcrypto pour gen_random_uuid()

  2. Garde-fous permanents
    - Contrainte CHECK useful_life_years >= 1 sur amortizations
    - DEFAULT gen_random_uuid() sur toutes les colonnes id uuid
    - Fonction calculate_amortization() tolérante (pas de division par zéro)

  3. Seeds sûrs
    - Helpers get_or_create_test_user() et get_or_create_test_property()
    - Utilisation exclusive d'UUIDs réels
    - Données valides uniquement (years >= 1, montants positifs)

  4. RLS amortizations
    - Basé sur properties.user_id via JOIN
    - Plus de dépendance directe sur amortizations.user_id
*/

-- 1. Activer pgcrypto pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Nettoyage automatique des données invalides
DO $$
BEGIN
  -- Supprimer les amortizations avec placeholders string ou useful_life_years <= 0
  DELETE FROM public.amortizations
  WHERE user_id = 'test-user-id'
     OR property_id::text = 'test-property-id'
     OR useful_life_years <= 0;
  
  -- Supprimer les revenues avec placeholders string
  DELETE FROM public.revenues
  WHERE user_id = 'test-user-id'
     OR property_id::text = 'test-property-id';
  
  -- Supprimer les expenses avec placeholders string
  DELETE FROM public.expenses
  WHERE user_id = 'test-user-id'
     OR property_id::text = 'test-property-id';
  
  -- Supprimer les tenants avec placeholders string
  DELETE FROM public.tenants
  WHERE user_id = 'test-user-id'
     OR property_id::text = 'test-property-id';
  
  -- Supprimer les properties avec placeholders string
  DELETE FROM public.properties 
  WHERE user_id = 'test-user-id';
  
  -- Supprimer les users avec placeholders string
  DELETE FROM public.users 
  WHERE user_id = 'test-user-id';

  RAISE NOTICE '✅ Nettoyage automatique terminé - toutes les données avec placeholders supprimées';
END;
$$;

-- 3. Standardiser les DEFAULT sur gen_random_uuid() (idempotent)
DO $$
BEGIN
  -- users.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  -- properties.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.properties ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  -- revenues.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'revenues' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.revenues ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  -- expenses.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.expenses ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  -- declarations.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'declarations' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.declarations ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  -- notifications.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  -- tenants.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.tenants ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  -- amortizations.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'amortizations' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.amortizations ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  RAISE NOTICE '✅ DEFAULT gen_random_uuid() configuré sur toutes les colonnes id uuid';
END;
$$;

-- 4. Garde-fou strict sur useful_life_years (idempotent)
DO $$
BEGIN
  -- Ajouter la contrainte si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'amortizations_years_chk' 
    AND conrelid = 'public.amortizations'::regclass
  ) THEN
    ALTER TABLE public.amortizations 
    ADD CONSTRAINT amortizations_years_chk 
    CHECK (useful_life_years IS NULL OR useful_life_years >= 1);
    
    RAISE NOTICE '✅ Contrainte useful_life_years >= 1 ajoutée';
  ELSE
    RAISE NOTICE '✅ Contrainte useful_life_years >= 1 déjà présente';
  END IF;
END;
$$;

-- 5. Fonction calculate_amortization tolérante (idempotent)
CREATE OR REPLACE FUNCTION calculate_amortization()
RETURNS TRIGGER AS $$
BEGIN
  -- Validation des données d'entrée
  IF NEW.purchase_amount IS NULL OR NEW.purchase_amount <= 0 THEN
    NEW.annual_amortization := 0;
    NEW.remaining_value := 0;
    RETURN NEW;
  END IF;

  -- Gestion tolérante de useful_life_years
  IF NEW.useful_life_years IS NULL OR NEW.useful_life_years <= 0 THEN
    -- Ne pas calculer si années invalides, mais ne pas planter
    NEW.annual_amortization := 0;
    NEW.remaining_value := NEW.purchase_amount;
    RETURN NEW;
  END IF;

  -- Calculs sécurisés
  NEW.annual_amortization := ROUND(NEW.purchase_amount / NEW.useful_life_years, 2);
  
  -- Calcul de l'amortissement cumulé basé sur les années écoulées
  DECLARE
    years_elapsed INTEGER;
    purchase_year INTEGER;
    current_year INTEGER;
  BEGIN
    purchase_year := EXTRACT(YEAR FROM NEW.purchase_date);
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    years_elapsed := GREATEST(0, current_year - purchase_year);
    
    -- Limiter l'amortissement cumulé au maximum possible
    NEW.accumulated_amortization := LEAST(
      NEW.annual_amortization * years_elapsed,
      NEW.purchase_amount
    );
  END;
  
  -- Calcul de la valeur résiduelle
  NEW.remaining_value := GREATEST(0, NEW.purchase_amount - NEW.accumulated_amortization);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Helpers pour seeds sûrs (idempotents)
CREATE OR REPLACE FUNCTION get_or_create_test_user()
RETURNS uuid AS $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Essayer de récupérer un utilisateur existant
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email LIKE '%@example.com' OR email LIKE '%test%'
  LIMIT 1;
  
  -- Si aucun utilisateur trouvé, prendre le premier disponible
  IF test_user_id IS NULL THEN
    SELECT id INTO test_user_id 
    FROM auth.users 
    LIMIT 1;
  END IF;
  
  -- Si toujours aucun utilisateur, en créer un (fallback)
  IF test_user_id IS NULL THEN
    test_user_id := gen_random_uuid();
    
    -- Créer un utilisateur minimal dans auth.users (si possible)
    BEGIN
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (
        test_user_id,
        'test-' || substring(test_user_id::text, 1, 8) || '@example.com',
        crypt('password123', gen_salt('bf')),
        now(),
        now(),
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Si échec (permissions), utiliser juste l'UUID généré
      NULL;
    END;
  END IF;
  
  RETURN test_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_or_create_test_property(owner_user_id uuid)
RETURNS uuid AS $$
DECLARE
  test_property_id uuid;
  table_name text;
BEGIN
  -- Auto-détection de la table properties
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
    RAISE EXCEPTION 'Aucune table properties/biens/lmnp_biens trouvée';
  END IF;
  
  -- Essayer de récupérer une propriété existante
  EXECUTE format('SELECT id FROM public.%I WHERE user_id = $1 LIMIT 1', table_name)
  INTO test_property_id
  USING owner_user_id;
  
  -- Si aucune propriété trouvée, en créer une
  IF test_property_id IS NULL THEN
    test_property_id := gen_random_uuid();
    
    -- Créer une propriété minimale (adapter selon la structure)
    IF table_name = 'properties' THEN
      INSERT INTO public.properties (id, user_id, address, monthly_rent, start_date)
      VALUES (
        test_property_id,
        owner_user_id,
        'Test Property ' || substring(test_property_id::text, 1, 8),
        1000,
        CURRENT_DATE
      )
      ON CONFLICT (id) DO NOTHING;
    ELSE
      -- Fallback pour autres tables
      EXECUTE format(
        'INSERT INTO public.%I (id, user_id, address, monthly_rent) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        table_name
      ) USING test_property_id, owner_user_id, 'Test Property', 1000;
    END IF;
  END IF;
  
  RETURN test_property_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Logs de validation
DO $$
DECLARE
  placeholder_count INTEGER;
  invalid_years_count INTEGER;
BEGIN
  -- Compter les placeholders restants
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
  
  -- Compter les useful_life_years invalides
  SELECT COUNT(*) INTO invalid_years_count
  FROM public.amortizations 
  WHERE useful_life_years <= 0;
  
  RAISE NOTICE '📊 Validation finale:';
  RAISE NOTICE '   - Placeholders restants: %', placeholder_count;
  RAISE NOTICE '   - useful_life_years <= 0: %', invalid_years_count;
  
  IF placeholder_count = 0 AND invalid_years_count = 0 THEN
    RAISE NOTICE '✅ Migration réussie - aucune donnée invalide détectée';
  ELSE
    RAISE WARNING '⚠️  Données invalides détectées - vérification manuelle requise';
  END IF;
END;
$$;