-- ============================================================================
-- Smoke test : détection des placeholders et garde-fous amortization
-- ============================================================================
-- Ce script vérifie :
--   1. Qu'aucune colonne critique ne contient de placeholders (test-*, placeholder-*)
--   2. Qu'aucun amortissement ne possède useful_life_years <= 0
--   3. Que les enregistrements de démonstration créés par le seed existent
-- ============================================================================

SELECT '📋 Smoke test placeholders & amortization' AS info;

-- 1. Vérifier l'absence de placeholders string
DO $$
DECLARE
  rec RECORD;
  placeholder_hits integer;
  total_hits integer := 0;
BEGIN
  FOR rec IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('id', 'user_id', 'created_by', 'property_id', 'tenant_id')
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM public.%I WHERE (%I)::text ~ ''^(test-|placeholder)''
         OR (%I)::text IN (''test-user-id'', ''test-property-id'')',
      rec.table_name, rec.column_name, rec.column_name
    ) INTO placeholder_hits;

    IF placeholder_hits > 0 THEN
      total_hits := total_hits + placeholder_hits;
      RAISE WARNING '❌ % placeholders détectés dans %.%', placeholder_hits, rec.table_name, rec.column_name;
    END IF;
  END LOOP;

  IF total_hits > 0 THEN
    RAISE EXCEPTION '❌ % valeurs placeholder détectées dans la base', total_hits;
  END IF;

  RAISE NOTICE '✅ Aucun placeholder string détecté';
END;
$$;

-- 2. Vérifier les amortissements (useful_life_years >= 1)
DO $$
DECLARE
  invalid_rows integer := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'amortizations'
  ) THEN
    SELECT COUNT(*) INTO invalid_rows
    FROM public.amortizations
    WHERE useful_life_years IS NOT NULL AND useful_life_years <= 0;

    IF invalid_rows > 0 THEN
      RAISE EXCEPTION '❌ % amortizations avec useful_life_years <= 0 détectés', invalid_rows;
    END IF;

    RAISE NOTICE '✅ Contraintes amortization respectées (useful_life_years >= 1)';
  ELSE
    RAISE NOTICE '⚠️  Table amortizations absente, test ignoré';
  END IF;
END;
$$;

-- 3. Vérifier la présence du seed de démonstration
DO $$
DECLARE
  demo_uid constant text := 'demo-user-pilotimmo';
  has_user boolean;
  has_property boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE uid = demo_uid
  ) INTO has_user;

  IF NOT has_user THEN
    RAISE EXCEPTION '❌ Utilisateur de démo (% ) absent : exécuter sql/seed_dev_amortization.sql', demo_uid;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.properties WHERE user_id = demo_uid
  ) INTO has_property;

  IF NOT has_property THEN
    RAISE EXCEPTION '❌ Propriété de démo absente pour l''utilisateur %', demo_uid;
  END IF;

  RAISE NOTICE '✅ Seed de démonstration présent (user & property)';
END;
$$;

SELECT '✅ Smoke test placeholders terminé' AS status;
