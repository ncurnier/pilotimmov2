/*
  # Correctif global UUID + uid() + amortization

  1. Extensions
    - Active pgcrypto pour gen_random_uuid()
  
  2. Corrections UUID
    - Remplace tous les DEFAULT uid() par DEFAULT gen_random_uuid()
    - Corrige les colonnes id existantes sans default
  
  3. Amortization sécurisé
    - Empêche division par zéro
    - Neutralise le calcul tant que les colonnes ne sont pas confirmées
    - Ajoute contraintes de qualité
  
  4. Seeds compatibles
    - Utilise de vrais UUID au lieu de strings test
*/

-- =============================================
-- 1. EXTENSIONS
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- 2. CORRECTIONS UUID - DEFAULT uid() → gen_random_uuid()
-- =============================================

-- Corriger les tables existantes avec DEFAULT uid() ou sans default
DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
BEGIN
    -- Parcourir toutes les tables avec colonnes id de type uuid
    FOR table_record IN 
        SELECT DISTINCT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    LOOP
        -- Vérifier si la colonne a un default problématique ou pas de default
        SELECT column_default INTO column_record
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_record.table_name 
        AND column_name = 'id';
        
        -- Si pas de default ou default uid(), corriger
        IF column_record.column_default IS NULL OR column_record.column_default LIKE '%uid()%' THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()', table_record.table_name);
            RAISE NOTICE 'Corrigé DEFAULT pour table: %', table_record.table_name;
        END IF;
    END LOOP;
END $$;

-- =============================================
-- 3. AMORTIZATION - SÉCURISATION CALCUL
-- =============================================

-- S'assurer que la colonne annual_expense existe et n'est PAS générée
DO $$
BEGIN
    -- Supprimer si c'est une colonne générée
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='amortizations'
        AND column_name='annual_expense' AND is_generated='ALWAYS'
    ) THEN
        ALTER TABLE public.amortizations DROP COLUMN annual_expense;
        RAISE NOTICE 'Supprimé colonne générée annual_expense';
    END IF;

    -- Ajouter si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='amortizations'
        AND column_name='annual_expense'
    ) THEN
        ALTER TABLE public.amortizations ADD COLUMN annual_expense numeric(12,2);
        RAISE NOTICE 'Ajouté colonne annual_expense';
    END IF;
END $$;

-- Fonction de calcul tolérante (pas d'erreur si years<=0)
CREATE OR REPLACE FUNCTION public.calculate_amortization()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    -- Vérification sécurisée des années
    IF COALESCE(NEW.useful_life_years, 0) <= 0 THEN
        NEW.annual_expense := NULL;
        RAISE NOTICE 'Amortization: useful_life_years <= 0, annual_expense = NULL pour item: %', NEW.item_name;
    ELSE
        -- 🔒 NEUTRALISÉ tant que la base de calcul n'est pas confirmée
        -- Quand les vraies colonnes seront définies, remplacer par le vrai calcul
        NEW.annual_expense := NULL;
        RAISE NOTICE 'Amortization: calcul neutralisé pour item: %', NEW.item_name;
    END IF;
    
    -- Calculs automatiques existants (si présents)
    IF COALESCE(NEW.useful_life_years, 0) > 0 AND COALESCE(NEW.purchase_amount, 0) > 0 THEN
        NEW.annual_amortization := ROUND(NEW.purchase_amount / NEW.useful_life_years, 2);
        NEW.remaining_value := NEW.purchase_amount - COALESCE(NEW.accumulated_amortization, 0);
    ELSE
        NEW.annual_amortization := 0;
        NEW.remaining_value := COALESCE(NEW.purchase_amount, 0);
    END IF;
    
    RETURN NEW;
END
$fn$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS amortizations_biur ON public.amortizations;
CREATE TRIGGER amortizations_biur
    BEFORE INSERT OR UPDATE ON public.amortizations
    FOR EACH ROW EXECUTE FUNCTION public.calculate_amortization();

-- Garde-fou qualité (sans bloquer l'import historique)
ALTER TABLE public.amortizations
    DROP CONSTRAINT IF EXISTS amortizations_years_chk;
ALTER TABLE public.amortizations
    ADD CONSTRAINT amortizations_years_chk
    CHECK (useful_life_years IS NULL OR useful_life_years >= 1);

-- =============================================
-- 4. SEEDS AVEC VRAIS UUID
-- =============================================

-- Exemple de seed idempotent pour tests
DO $$
DECLARE
    test_user_id uuid;
    test_property_id uuid;
BEGIN
    -- Récupérer ou créer un utilisateur de test
    SELECT user_id::uuid INTO test_user_id 
    FROM public.users 
    LIMIT 1;
    
    -- Si pas d'utilisateur, en créer un fictif pour les tests
    IF test_user_id IS NULL THEN
        INSERT INTO public.users (id, user_id, email, display_name)
        VALUES (
            gen_random_uuid(),
            gen_random_uuid()::text,
            'test@example.com',
            'Test User'
        )
        ON CONFLICT (email) DO NOTHING
        RETURNING user_id::uuid INTO test_user_id;
    END IF;
    
    -- Récupérer ou créer une propriété de test
    SELECT id INTO test_property_id 
    FROM public.properties 
    WHERE user_id = test_user_id::text
    LIMIT 1;
    
    IF test_property_id IS NULL THEN
        INSERT INTO public.properties (id, user_id, address, start_date, monthly_rent)
        VALUES (
            gen_random_uuid(),
            test_user_id::text,
            'Bien de test - ' || gen_random_uuid()::text,
            CURRENT_DATE,
            1000
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO test_property_id;
    END IF;
    
    -- Insérer des amortissements de test avec vrais UUID
    IF test_user_id IS NOT NULL AND test_property_id IS NOT NULL THEN
        -- Test avec years=0 (ne doit pas planter)
        INSERT INTO public.amortizations (
            id, user_id, property_id, item_name, category, 
            purchase_date, purchase_amount, useful_life_years
        )
        VALUES (
            gen_random_uuid(),
            test_user_id::text,
            test_property_id,
            'Test Item ZERO years',
            'mobilier',
            CURRENT_DATE,
            500,
            0
        )
        ON CONFLICT DO NOTHING;
        
        -- Test avec years=10 (normal)
        INSERT INTO public.amortizations (
            id, user_id, property_id, item_name, category,
            purchase_date, purchase_amount, useful_life_years
        )
        VALUES (
            gen_random_uuid(),
            test_user_id::text,
            test_property_id,
            'Test Item OK',
            'mobilier',
            CURRENT_DATE,
            1000,
            10
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Seeds de test créés avec user_id: % et property_id: %', test_user_id, test_property_id;
    END IF;
END $$;

-- =============================================
-- 5. VÉRIFICATIONS FINALES
-- =============================================

-- Vérifier que pgcrypto est bien activée
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RAISE EXCEPTION 'Extension pgcrypto non activée !';
    END IF;
    RAISE NOTICE 'Extension pgcrypto: OK';
END $$;

-- Test de génération UUID
DO $$
DECLARE
    test_uuid uuid;
BEGIN
    SELECT gen_random_uuid() INTO test_uuid;
    IF test_uuid IS NULL THEN
        RAISE EXCEPTION 'gen_random_uuid() ne fonctionne pas !';
    END IF;
    RAISE NOTICE 'Test gen_random_uuid(): OK - %', test_uuid;
END $$;

-- Vérifier qu'il n'y a plus de DEFAULT uid() problématique
DO $$
DECLARE
    bad_default_count integer;
BEGIN
    SELECT COUNT(*) INTO bad_default_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_default LIKE '%uid()%'
    AND column_default NOT LIKE '%auth.uid()%';
    
    IF bad_default_count > 0 THEN
        RAISE WARNING 'Il reste % colonnes avec DEFAULT uid() problématique', bad_default_count;
    ELSE
        RAISE NOTICE 'Aucun DEFAULT uid() problématique trouvé: OK';
    END IF;
END $$;

RAISE NOTICE '=== MIGRATION TERMINÉE AVEC SUCCÈS ===';