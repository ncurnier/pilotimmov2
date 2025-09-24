-- ============================================================================
-- Smoke test Postgres/Supabase pour PilotImmo
-- ============================================================================
-- Ce script s'exécute en SQL pur (aucune méta-commande psql) afin d'être
-- compatible avec les outils comme Supabase SQL Editor ou Bolt.
-- Il vérifie les points essentiels suivants :
--   1. Extension pgcrypto disponible
--   2. Génération d'UUID via gen_random_uuid()
--   3. Cohérence du schéma properties (colonnes user_id et created_by)
--   4. Absence de placeholders string dans les colonnes critiques
--   5. Contrainte useful_life_years >= 1 présente sur amortizations
--   6. Aucune donnée amortizations avec useful_life_years <= 0
-- ============================================================================

SELECT '🧪 SMOKE TEST - PilotImmo (SQL pur)' AS info;

-- 1. Vérifier que pgcrypto est disponible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE EXCEPTION '❌ Extension pgcrypto non activée';
  END IF;

  RAISE NOTICE '✅ Extension pgcrypto active';
END;
$$;

-- 2. Vérifier que gen_random_uuid() fonctionne
DO $$
DECLARE
  test_uuid uuid;
BEGIN
  SELECT gen_random_uuid() INTO test_uuid;
  IF test_uuid IS NULL THEN
    RAISE EXCEPTION '❌ gen_random_uuid() a retourné NULL';
  END IF;

  RAISE NOTICE '✅ gen_random_uuid() fonctionne (%).', test_uuid;
END;
$$;

-- 3. Vérifier la présence de properties.user_id et properties.created_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'properties'
  ) THEN
    RAISE EXCEPTION '❌ Table public.properties absente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION '❌ Colonne properties.user_id manquante';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'created_by'
  ) THEN
    RAISE EXCEPTION '❌ Colonne properties.created_by manquante';
  END IF;

  RAISE NOTICE '✅ Table properties et colonnes user_id/created_by présentes';
END;
$$;

-- 4. Vérifier qu'aucun placeholder string ne subsiste dans les colonnes critiques
DO $$
DECLARE
  col RECORD;
  placeholder_count integer;
BEGIN
  FOR col IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('id', 'user_id', 'created_by', 'property_id')
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM public.%I WHERE (%I)::text ~ ''^(test-|placeholder)''
         OR (%I)::text IN (''test-user-id'', ''test-property-id'')',
      col.table_name, col.column_name, col.column_name
    )
    INTO placeholder_count;

    IF placeholder_count > 0 THEN
      RAISE EXCEPTION '❌ Placeholders détectés dans %.% (% occurrences)',
        col.table_name, col.column_name, placeholder_count;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Aucun placeholder string détecté dans les colonnes critiques';
END;
$$;

-- 5. Vérifier que la contrainte useful_life_years >= 1 est bien présente
DO $$
DECLARE
  constraint_ok boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'amortizations'
  ) THEN
    RAISE NOTICE '⚠️  Table amortizations absente, test ignoré';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'amortizations'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%useful_life_years%>= 1%'
        OR pg_get_constraintdef(c.oid) ILIKE '%useful_life_years%> 0%'
      )
  ) INTO constraint_ok;

  IF NOT constraint_ok THEN
    RAISE EXCEPTION '❌ Contrainte useful_life_years >= 1 absente sur amortizations';
  END IF;

  RAISE NOTICE '✅ Contrainte useful_life_years >= 1 active sur amortizations';
END;
$$;

-- 6. Vérifier qu'aucune ligne amortizations n'a useful_life_years <= 0
DO $$
DECLARE
  invalid_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'amortizations'
      AND column_name = 'useful_life_years'
  ) THEN
    RAISE NOTICE '⚠️  Colonne useful_life_years absente, test ignoré';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM public.amortizations
  WHERE useful_life_years IS NOT NULL AND useful_life_years <= 0;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION '❌ useful_life_years <= 0 détectés (% lignes)', invalid_count;
  END IF;

  RAISE NOTICE '✅ Toutes les lignes amortizations ont useful_life_years >= 1';
END;
$$;

SELECT '✅ Smoke test SQL terminé avec succès' AS status;
