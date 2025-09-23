/*
  # Compatibilité Postgres/Supabase - Nettoyage final

  Cette migration garantit la compatibilité complète avec l'éditeur SQL Supabase
  en standardisant l'usage des UUID et en sécurisant les calculs d'amortissement.

  ## 1. Extensions
  - Active pgcrypto pour gen_random_uuid()

  ## 2. Standardisation UUID
  - Corrige tous les DEFAULT uid() vers gen_random_uuid()
  - Nettoie les données invalides existantes

  ## 3. Sécurisation amortization
  - Contrainte useful_life_years >= 1
  - Fonction calculate_amortization() tolérante (pas de division par zéro)
  - Colonne annual_expense non générée

  ## 4. Helpers pour tests
  - Fonctions get_or_create_test_user/property
  - Auto-détection des tables de propriétés

  ## 5. Nettoyage
  - Suppression des données de test invalides
  - Seeds idempotents avec UUID réels
*/

-- ============================================================================
-- 1. EXTENSIONS ET PRÉPARATION
-- ============================================================================

-- Activer pgcrypto pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Vérifier que l'extension est bien activée
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'Extension pgcrypto non disponible. Impossible de continuer.';
  END IF;
  RAISE NOTICE 'Extension pgcrypto activée avec succès';
END $$;

-- ============================================================================
-- 2. STANDARDISATION UUID - CORRECTION DES DEFAULT
-- ============================================================================

-- Corriger les DEFAULT uid() vers gen_random_uuid() pour toutes les tables
DO $$
DECLARE
  table_record RECORD;
  column_record RECORD;
BEGIN
  -- Parcourir toutes les tables avec des colonnes id de type uuid
  FOR table_record IN 
    SELECT DISTINCT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name = 'id' 
      AND data_type = 'uuid'
  LOOP
    -- Vérifier le DEFAULT actuel
    SELECT column_default INTO column_record
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = table_record.table_name 
      AND column_name = 'id';
    
    -- Si pas de default ou si c'est uid(), corriger
    IF column_record.column_default IS NULL OR column_record.column_default LIKE '%uid()%' THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()', table_record.table_name);
      RAISE NOTICE 'Table %.id DEFAULT corrigé vers gen_random_uuid()', table_record.table_name;
    ELSE
      RAISE NOTICE 'Table %.id DEFAULT déjà correct: %', table_record.table_name, column_record.column_default;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 3. HELPERS POUR TESTS ET SEEDS
-- ============================================================================

-- Helper : récupérer ou créer un utilisateur de test
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
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé dans auth.users. Créez un utilisateur via Supabase Auth d''abord.';
  END IF;
  
  RETURN test_user_id;
END $$;

-- Helper : récupérer ou créer une propriété de test
CREATE OR REPLACE FUNCTION get_or_create_test_property(owner_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  test_property_id uuid;
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
  INTO test_property_id
  USING owner_user_id;
  
  -- Si aucune propriété, en créer une
  IF test_property_id IS NULL THEN
    EXECUTE format('
      INSERT INTO public.%I (user_id, address, start_date, monthly_rent, status)
      VALUES ($1, ''Bien de test - '' || $1::text, CURRENT_DATE, 1000, ''active'')
      ON CONFLICT DO NOTHING
      RETURNING id
    ', table_name)
    INTO test_property_id
    USING owner_user_id;
    
    -- Si toujours NULL (conflit), récupérer l'existant
    IF test_property_id IS NULL THEN
      EXECUTE format('SELECT id FROM public.%I WHERE user_id = $1 LIMIT 1', table_name)
      INTO test_property_id
      USING owner_user_id;
    END IF;
  END IF;
  
  RAISE NOTICE 'Propriété de test: % (table: %)', test_property_id, table_name;
  RETURN test_property_id;
END $$;

-- ============================================================================
-- 4. SÉCURISATION AMORTIZATION
-- ============================================================================

-- S'assurer que la table amortizations existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'amortizations'
  ) THEN
    RAISE NOTICE 'Table amortizations non trouvée, création ignorée';
    RETURN;
  END IF;

  -- S'assurer que annual_expense existe et n'est PAS générée
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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'amortizations'
      AND column_name = 'annual_expense'
  ) THEN
    ALTER TABLE public.amortizations ADD COLUMN annual_expense numeric(12,2);
    RAISE NOTICE 'Colonne annual_expense ajoutée';
  END IF;

  -- Contrainte de qualité : empêcher useful_life_years <= 0
  ALTER TABLE public.amortizations 
    DROP CONSTRAINT IF EXISTS amortizations_years_chk;
  
  ALTER TABLE public.amortizations 
    ADD CONSTRAINT amortizations_years_chk 
    CHECK (useful_life_years IS NULL OR useful_life_years >= 1);
  
  RAISE NOTICE 'Contrainte useful_life_years >= 1 ajoutée';
END $$;

-- Fonction calculate_amortization() tolérante (pas de division par zéro)
CREATE OR REPLACE FUNCTION public.calculate_amortization()
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
BEGIN
  -- Calculs de base (annual_amortization, accumulated_amortization, remaining_value)
  IF COALESCE(NEW.useful_life_years, 0) <= 0 THEN
    NEW.annual_amortization := 0;
    NEW.accumulated_amortization := COALESCE(NEW.accumulated_amortization, 0);
    NEW.remaining_value := NEW.purchase_amount - NEW.accumulated_amortization;
  ELSE
    NEW.annual_amortization := ROUND(NEW.purchase_amount / NEW.useful_life_years, 2);
    NEW.accumulated_amortization := COALESCE(NEW.accumulated_amortization, 0);
    NEW.remaining_value := NEW.purchase_amount - NEW.accumulated_amortization;
  END IF;

  -- annual_expense neutralisé tant que la formule n'est pas confirmée
  NEW.annual_expense := NULL;
  
  RETURN NEW;
END $$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS amortizations_biur ON public.amortizations;
DROP TRIGGER IF EXISTS trg_amortizations_calculate ON public.amortizations;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'amortizations'
  ) THEN
    CREATE TRIGGER trg_amortizations_calculate
      BEFORE INSERT OR UPDATE ON public.amortizations
      FOR EACH ROW EXECUTE FUNCTION public.calculate_amortization();
    
    RAISE NOTICE 'Trigger calculate_amortization recréé';
  END IF;
END $$;

-- ============================================================================
-- 5. NETTOYAGE DES DONNÉES INVALIDES
-- ============================================================================

-- Supprimer les données avec des strings dans les colonnes UUID
DO $$
DECLARE
  table_record RECORD;
  cleanup_count integer;
BEGIN
  -- Nettoyer toutes les tables avec des colonnes UUID contenant des strings
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('users', 'properties', 'revenues', 'expenses', 'declarations', 'notifications', 'tenants', 'amortizations')
  LOOP
    -- Nettoyer les colonnes id avec des strings
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = table_record.table_name 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
      EXECUTE format('
        DELETE FROM public.%I 
        WHERE id::text LIKE ''test-%%'' 
           OR id::text = ''test-user-id'' 
           OR id::text = ''test-property-id''
      ', table_record.table_name);
      
      GET DIAGNOSTICS cleanup_count = ROW_COUNT;
      IF cleanup_count > 0 THEN
        RAISE NOTICE 'Nettoyé % lignes invalides de %.id', cleanup_count, table_record.table_name;
      END IF;
    END IF;
    
    -- Nettoyer les colonnes user_id avec des strings
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = table_record.table_name 
        AND column_name = 'user_id'
    ) THEN
      EXECUTE format('
        DELETE FROM public.%I 
        WHERE user_id LIKE ''test-%%'' 
           OR user_id = ''test-user-id''
      ', table_record.table_name);
      
      GET DIAGNOSTICS cleanup_count = ROW_COUNT;
      IF cleanup_count > 0 THEN
        RAISE NOTICE 'Nettoyé % lignes invalides de %.user_id', cleanup_count, table_record.table_name;
      END IF;
    END IF;
    
    -- Nettoyer les colonnes property_id avec des strings
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = table_record.table_name 
        AND column_name = 'property_id' 
        AND data_type = 'uuid'
    ) THEN
      EXECUTE format('
        DELETE FROM public.%I 
        WHERE property_id::text LIKE ''test-%%'' 
           OR property_id::text = ''test-property-id''
      ', table_record.table_name);
      
      GET DIAGNOSTICS cleanup_count = ROW_COUNT;
      IF cleanup_count > 0 THEN
        RAISE NOTICE 'Nettoyé % lignes invalides de %.property_id', cleanup_count, table_record.table_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Nettoyer les amortizations avec useful_life_years <= 0
DO $$
DECLARE
  cleanup_count integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'amortizations'
  ) THEN
    DELETE FROM public.amortizations 
    WHERE useful_life_years IS NOT NULL AND useful_life_years <= 0;
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    IF cleanup_count > 0 THEN
      RAISE NOTICE 'Supprimé % amortizations avec useful_life_years <= 0', cleanup_count;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 6. SEEDS AVEC UUID RÉELS (IDEMPOTENTS)
-- ============================================================================

-- Créer des données de test valides si nécessaire
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
BEGIN
  -- Récupérer un utilisateur de test
  BEGIN
    test_user_id := get_or_create_test_user();
    RAISE NOTICE 'Utilisateur de test: %', test_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Pas d''utilisateur disponible pour les seeds de test: %', SQLERRM;
    RETURN;
  END;
  
  -- Récupérer/créer une propriété de test
  BEGIN
    test_property_id := get_or_create_test_property(test_user_id);
    RAISE NOTICE 'Propriété de test: %', test_property_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Impossible de créer une propriété de test: %', SQLERRM;
    RETURN;
  END;
  
  -- Seed amortization valide (si table existe)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'amortizations'
  ) THEN
    INSERT INTO public.amortizations (
      user_id, property_id, item_name, category, 
      purchase_date, purchase_amount, useful_life_years, status
    )
    VALUES (
      test_user_id::text, test_property_id, 'Équipement de test', 'mobilier',
      CURRENT_DATE, 1000, 10, 'active'
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Seed amortization créé avec UUID réels';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur lors des seeds: %', SQLERRM;
END $$;

-- ============================================================================
-- 7. VALIDATION FINALE
-- ============================================================================

-- Vérifier qu'aucune fonction uid() problématique ne subsiste
DO $$
DECLARE
  uid_count integer;
BEGIN
  -- Compter les occurrences de uid() dans les définitions de colonnes
  SELECT COUNT(*) INTO uid_count
  FROM information_schema.columns
  WHERE column_default LIKE '%uid()%';
  
  IF uid_count > 0 THEN
    RAISE WARNING 'Encore % colonnes avec DEFAULT uid() détectées', uid_count;
  ELSE
    RAISE NOTICE 'Aucun DEFAULT uid() problématique détecté ✅';
  END IF;
END $$;

-- Vérifier la génération UUID
DO $$
DECLARE
  test_uuid uuid;
BEGIN
  test_uuid := gen_random_uuid();
  IF test_uuid IS NULL THEN
    RAISE EXCEPTION 'gen_random_uuid() ne fonctionne pas';
  ELSE
    RAISE NOTICE 'Génération UUID fonctionnelle: % ✅', test_uuid;
  END IF;
END $$;

-- Nettoyer les fonctions helpers (optionnel)
DROP FUNCTION IF EXISTS get_or_create_test_user();
DROP FUNCTION IF EXISTS get_or_create_test_property(uuid);

RAISE NOTICE '🎯 Migration de compatibilité Postgres/Supabase terminée avec succès';