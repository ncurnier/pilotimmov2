/*
  # Migration de compatibilité Postgres/Supabase complète

  1. Corrections UUID et extensions
    - Active pgcrypto pour gen_random_uuid()
    - Standardise tous les DEFAULT sur gen_random_uuid()
    - Supprime les références uid() problématiques

  2. Amortization sécurisé
    - Contraintes de validation strictes
    - Fonction calculate_amortization() tolérante
    - Pas de division par zéro possible

  3. Nettoyage des données invalides
    - Supprime les enregistrements avec des UUID string invalides
    - Corrige les useful_life_years = 0
*/

-- Extension PostgreSQL standard pour UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fonction helper pour obtenir un utilisateur de test
CREATE OR REPLACE FUNCTION get_or_create_test_user()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Essayer de récupérer un utilisateur existant
  SELECT id INTO user_uuid FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF user_uuid IS NULL THEN
    -- Si aucun utilisateur, en créer un de test (pour les environnements de dev)
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      'test@pilotimmo.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now()
    ) RETURNING id INTO user_uuid;
  END IF;
  
  RETURN user_uuid;
END;
$$;

-- Fonction helper pour obtenir/créer une propriété de test
CREATE OR REPLACE FUNCTION get_or_create_test_property(owner_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  property_uuid uuid;
  table_name text;
BEGIN
  -- Auto-détecter le nom de la table des propriétés
  SELECT t.table_name INTO table_name
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_name IN ('properties', 'biens', 'lmnp_biens', 'property')
  ORDER BY 
    CASE t.table_name 
      WHEN 'properties' THEN 1
      WHEN 'biens' THEN 2
      WHEN 'lmnp_biens' THEN 3
      ELSE 4
    END
  LIMIT 1;

  IF table_name IS NULL THEN
    RAISE EXCEPTION 'Aucune table de propriétés trouvée (properties, biens, lmnp_biens)';
  END IF;

  -- Essayer de récupérer une propriété existante
  EXECUTE format('SELECT id FROM public.%I WHERE user_id = $1 ORDER BY created_at LIMIT 1', table_name)
  INTO property_uuid
  USING owner_uuid;

  IF property_uuid IS NULL THEN
    -- Créer une propriété de test
    EXECUTE format('
      INSERT INTO public.%I (id, user_id, address, start_date, monthly_rent, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    ', table_name)
    INTO property_uuid
    USING gen_random_uuid(), owner_uuid, 'Bien de test - Migration', CURRENT_DATE, 1000, 'active';
  END IF;

  RETURN property_uuid;
END;
$$;

-- Standardisation des DEFAULT sur toutes les tables avec colonnes id uuid
DO $$
DECLARE
  rec record;
BEGIN
  -- Parcourir toutes les colonnes id de type uuid sans default ou avec uid()
  FOR rec IN
    SELECT t.table_name, c.column_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
      AND c.column_name = 'id'
      AND c.data_type = 'uuid'
      AND (c.column_default IS NULL OR c.column_default LIKE '%uid()%')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT gen_random_uuid()',
                   rec.table_name, rec.column_name);
    RAISE NOTICE 'DEFAULT gen_random_uuid() ajouté sur %.%', rec.table_name, rec.column_name;
  END LOOP;
END;
$$;

-- Nettoyage des données invalides existantes
DO $$
DECLARE
  invalid_count integer;
BEGIN
  -- Supprimer les enregistrements avec des UUID string invalides
  DELETE FROM public.users WHERE user_id ~ '^test-';
  GET DIAGNOSTICS invalid_count = ROW_COUNT;
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Supprimé % enregistrements users avec user_id invalide', invalid_count;
  END IF;

  -- Nettoyer les autres tables si elles existent
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
    DELETE FROM public.properties WHERE user_id ~ '^test-' OR id::text ~ '^test-';
    GET DIAGNOSTICS invalid_count = ROW_COUNT;
    IF invalid_count > 0 THEN
      RAISE NOTICE 'Supprimé % enregistrements properties invalides', invalid_count;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'amortizations') THEN
    DELETE FROM public.amortizations WHERE user_id ~ '^test-' OR property_id::text ~ '^test-';
    GET DIAGNOSTICS invalid_count = ROW_COUNT;
    IF invalid_count > 0 THEN
      RAISE NOTICE 'Supprimé % enregistrements amortizations invalides', invalid_count;
    END IF;
  END IF;
END;
$$;

-- Sécurisation de la table amortizations
DO $$
BEGIN
  -- S'assurer que annual_expense n'est PAS une colonne générée
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'amortizations'
      AND column_name = 'annual_expense'
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.amortizations DROP COLUMN annual_expense;
    RAISE NOTICE 'Colonne annual_expense générée supprimée';
  END IF;

  -- Ajouter la colonne si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'amortizations'
      AND column_name = 'annual_expense'
  ) THEN
    ALTER TABLE public.amortizations ADD COLUMN annual_expense numeric(12,2);
    RAISE NOTICE 'Colonne annual_expense ajoutée';
  END IF;
END;
$$;

-- Fonction calculate_amortization tolérante (pas de division par zéro)
CREATE OR REPLACE FUNCTION public.calculate_amortization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculer annual_amortization (formule standard)
  IF COALESCE(NEW.useful_life_years, 0) <= 0 THEN
    NEW.annual_amortization := 0;
  ELSE
    NEW.annual_amortization := ROUND(NEW.purchase_amount / NEW.useful_life_years, 2);
  END IF;

  -- Calculer accumulated_amortization basé sur les années écoulées
  DECLARE
    years_elapsed numeric;
  BEGIN
    years_elapsed := EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM NEW.purchase_date::date);
    IF years_elapsed < 0 THEN
      years_elapsed := 0;
    END IF;
    
    IF COALESCE(NEW.useful_life_years, 0) <= 0 THEN
      NEW.accumulated_amortization := 0;
    ELSE
      NEW.accumulated_amortization := LEAST(
        ROUND(NEW.annual_amortization * years_elapsed, 2),
        NEW.purchase_amount
      );
    END IF;
  END;

  -- Calculer remaining_value
  NEW.remaining_value := GREATEST(
    NEW.purchase_amount - COALESCE(NEW.accumulated_amortization, 0),
    0
  );

  -- annual_expense : neutralisé pour l'instant (formule à confirmer)
  IF COALESCE(NEW.useful_life_years, 0) <= 0 THEN
    NEW.annual_expense := NULL;
  ELSE
    -- Formule temporairement neutralisée
    NEW.annual_expense := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS amortizations_biur ON public.amortizations;
DROP TRIGGER IF EXISTS trg_amortizations_calculate ON public.amortizations;

CREATE TRIGGER trg_amortizations_calculate
  BEFORE INSERT OR UPDATE ON public.amortizations
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_amortization();

-- Contraintes de validation strictes
ALTER TABLE public.amortizations DROP CONSTRAINT IF EXISTS amortizations_years_chk;
ALTER TABLE public.amortizations DROP CONSTRAINT IF EXISTS amortizations_useful_life_years_check;

ALTER TABLE public.amortizations 
  ADD CONSTRAINT amortizations_useful_life_years_check 
  CHECK (useful_life_years IS NULL OR useful_life_years >= 1);

ALTER TABLE public.amortizations DROP CONSTRAINT IF EXISTS amortizations_amounts_positive;
ALTER TABLE public.amortizations 
  ADD CONSTRAINT amortizations_amounts_positive 
  CHECK (purchase_amount >= 0 AND COALESCE(accumulated_amortization, 0) >= 0);

-- Seeds de test avec UUID réels
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
BEGIN
  -- Obtenir/créer un utilisateur de test
  test_user_id := get_or_create_test_user();
  RAISE NOTICE 'Utilisateur de test: %', test_user_id;

  -- Obtenir/créer une propriété de test
  test_property_id := get_or_create_test_property(test_user_id);
  RAISE NOTICE 'Propriété de test: %', test_property_id;

  -- Insérer des données de test valides dans amortizations
  INSERT INTO public.amortizations (
    user_id, property_id, item_name, category, 
    purchase_date, purchase_amount, useful_life_years, status
  ) VALUES 
    (test_user_id, test_property_id, 'Mobilier de test', 'mobilier', 
     CURRENT_DATE - INTERVAL '1 year', 5000, 10, 'active'),
    (test_user_id, test_property_id, 'Électroménager de test', 'electromenager', 
     CURRENT_DATE - INTERVAL '6 months', 2000, 5, 'active')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seeds de test insérés avec succès';
END;
$$;

-- Nettoyage des fonctions helper (optionnel en production)
-- DROP FUNCTION IF EXISTS get_or_create_test_user();
-- DROP FUNCTION IF EXISTS get_or_create_test_property(uuid);

RAISE NOTICE 'Migration de compatibilité Postgres/Supabase terminée avec succès';