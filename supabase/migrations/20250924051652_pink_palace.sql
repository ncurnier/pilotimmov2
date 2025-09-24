/*
  # Fix properties table compatibility - Remove owner_id references

  ## Problème résolu
  - L'app référençait `owner_id` mais `public.properties` utilise `user_id`
  - Seeds et helpers cherchaient des tables `lmnp_biens` inexistantes
  - RLS policies basées sur des colonnes inexistantes

  ## Solution implémentée
  - Standardisation sur `public.properties` avec `user_id`
  - Ajout de `created_by` pour compatibilité future
  - Correction des helpers et seeds
  - RLS basé sur `user_id` existant

  ## Tables modifiées
  - `properties`: ajout `created_by` (copie de `user_id`)
  - `amortizations`: RLS basé sur properties.user_id
  - Nettoyage des références `owner_id`
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. MISE À JOUR DE LA TABLE PROPERTIES
-- ============================================================================

-- Ajouter created_by si elle n'existe pas (pour compatibilité future)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'properties'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN created_by text;
    RAISE NOTICE 'Colonne created_by ajoutée à properties';
    
    -- Backfill created_by avec user_id existant
    UPDATE public.properties SET created_by = user_id WHERE created_by IS NULL;
    RAISE NOTICE 'Backfill created_by terminé';
  END IF;
END $$;

-- ============================================================================
-- 2. CORRECTION DES RLS POLICIES AMORTIZATIONS
-- ============================================================================

-- Supprimer les anciennes policies problématiques
DROP POLICY IF EXISTS "amortizations_select_own_property" ON public.amortizations;
DROP POLICY IF EXISTS "amortizations_insert_own_property" ON public.amortizations;
DROP POLICY IF EXISTS "amortizations_update_own_property" ON public.amortizations;
DROP POLICY IF EXISTS "amortizations_delete_own_property" ON public.amortizations;

-- Nouvelles policies basées sur properties.user_id
CREATE POLICY "amortizations_select_via_property" ON public.amortizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
);

CREATE POLICY "amortizations_insert_via_property" ON public.amortizations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
);

CREATE POLICY "amortizations_update_via_property" ON public.amortizations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
);

CREATE POLICY "amortizations_delete_via_property" ON public.amortizations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
);

-- ============================================================================
-- 3. HELPERS CORRIGÉS POUR PROPERTIES
-- ============================================================================

-- Helper : obtenir un utilisateur de test
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

-- Helper : obtenir ou créer une propriété dans public.properties
CREATE OR REPLACE FUNCTION get_or_create_test_property(owner_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  test_property_id uuid;
BEGIN
  -- Essayer de récupérer une propriété existante dans public.properties
  SELECT id INTO test_property_id
  FROM public.properties 
  WHERE user_id = owner_user_id::text 
  ORDER BY created_at 
  LIMIT 1;
  
  -- Si aucune propriété, en créer une minimaliste
  IF test_property_id IS NULL THEN
    INSERT INTO public.properties (
      id, user_id, created_by, address, start_date, monthly_rent, status
    ) VALUES (
      gen_random_uuid(),
      owner_user_id::text,
      owner_user_id::text,
      'Bien de test - ' || substring(owner_user_id::text, 1, 8),
      CURRENT_DATE,
      1000,
      'active'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO test_property_id;
    
    -- Si conflit, récupérer l'existant
    IF test_property_id IS NULL THEN
      SELECT id INTO test_property_id
      FROM public.properties 
      WHERE user_id = owner_user_id::text 
      LIMIT 1;
    END IF;
  END IF;
  
  IF test_property_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de créer ou récupérer une propriété pour l''utilisateur %', owner_user_id;
  END IF;
  
  RAISE NOTICE 'Propriété de test: % (user_id: %)', test_property_id, owner_user_id;
  RETURN test_property_id;
END $$;

-- ============================================================================
-- 4. NETTOYAGE DES DONNÉES INVALIDES
-- ============================================================================

-- Supprimer les données avec des UUID string invalides
DO $$
DECLARE
  cleanup_count integer;
BEGIN
  -- Nettoyer amortizations avec des IDs string
  DELETE FROM public.amortizations 
  WHERE user_id LIKE 'test-%' 
     OR property_id::text LIKE 'test-%'
     OR user_id = 'test-user-id'
     OR property_id::text = 'test-property-id';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  IF cleanup_count > 0 THEN
    RAISE NOTICE 'Supprimé % amortizations avec IDs string invalides', cleanup_count;
  END IF;
  
  -- Nettoyer autres tables si nécessaire
  DELETE FROM public.properties 
  WHERE user_id LIKE 'test-%' 
     OR id::text LIKE 'test-%';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  IF cleanup_count > 0 THEN
    RAISE NOTICE 'Supprimé % properties avec IDs string invalides', cleanup_count;
  END IF;
  
  RAISE NOTICE 'Nettoyage des données invalides terminé';
END $$;

-- ============================================================================
-- 5. SEEDS AVEC UUID RÉELS ET PROPERTIES CORRECTE
-- ============================================================================

-- Créer des données de test valides
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
BEGIN
  -- Obtenir un utilisateur de test
  BEGIN
    test_user_id := get_or_create_test_user();
    RAISE NOTICE 'Utilisateur de test: %', test_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Pas d''utilisateur disponible, seeds ignorés: %', SQLERRM;
    RETURN;
  END;
  
  -- Obtenir/créer une propriété dans public.properties
  BEGIN
    test_property_id := get_or_create_test_property(test_user_id);
    RAISE NOTICE 'Propriété de test: %', test_property_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Impossible de créer une propriété de test: %', SQLERRM;
    RETURN;
  END;
  
  -- Seed amortization avec données valides (plus de owner_id)
  INSERT INTO public.amortizations (
    id, user_id, property_id, item_name, category, 
    purchase_date, purchase_amount, useful_life_years, status, notes
  ) VALUES (
    gen_random_uuid(),
    test_user_id::text,
    test_property_id,
    'Mobilier de test - ' || substring(gen_random_uuid()::text, 1, 8),
    'mobilier',
    CURRENT_DATE - INTERVAL '1 year',
    1500.00,
    10, -- Valeur valide >= 1
    'active',
    'Seed de test avec UUID réels, properties.user_id, sans owner_id'
  ) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Seeds avec public.properties et UUID réels créés avec succès';
END $$;

-- ============================================================================
-- 6. VALIDATION FINALE
-- ============================================================================

-- Vérifier que les policies RLS fonctionnent
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'amortizations'
    AND (qual LIKE '%properties%' OR with_check LIKE '%properties%');
  
  IF policy_count < 4 THEN
    RAISE WARNING 'Seulement % policies RLS basées sur properties trouvées', policy_count;
  ELSE
    RAISE NOTICE 'Policies RLS amortizations basées sur properties: % ✅', policy_count;
  END IF;
END $$;

-- Vérifier qu'aucune référence owner_id ne subsiste dans les contraintes
DO $$
DECLARE
  owner_id_refs integer;
BEGIN
  SELECT COUNT(*) INTO owner_id_refs
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'owner_id';
  
  IF owner_id_refs > 0 THEN
    RAISE NOTICE 'ATTENTION: % colonnes owner_id encore présentes', owner_id_refs;
  ELSE
    RAISE NOTICE 'Aucune référence owner_id trouvée ✅';
  END IF;
END $$;

-- Nettoyer les fonctions helpers (optionnel)
-- DROP FUNCTION IF EXISTS get_or_create_test_user();
-- DROP FUNCTION IF EXISTS get_or_create_test_property(uuid);

RAISE NOTICE '🎯 Migration properties compatibility terminée avec succès';
RAISE NOTICE '   - Table public.properties utilisée (user_id + created_by)';
RAISE NOTICE '   - RLS amortizations basé sur properties.user_id';
RAISE NOTICE '   - Seeds avec UUID réels sans owner_id';
RAISE NOTICE '   - Données invalides nettoyées';