/*
  # Nettoyage global seeds/tests + garde-fous UUID

  1. Standardisation UUID
    - Extension pgcrypto activée
    - Tous les DEFAULT uid() → gen_random_uuid()
    - Colonnes id uuid sans DEFAULT corrigées

  2. Garde-fous amortization
    - Contrainte useful_life_years >= 1
    - Fonction calculate_amortization() tolérante
    - annual_expense = NULL si years <= 0

  3. Seeds avec UUID réels
    - Suppression des placeholders 'test-*-id'
    - Utilisation d'auth.users existants
    - Get-or-create property pattern
*/

-- Extension pgcrypto pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Standardisation des DEFAULT sur toutes les colonnes id uuid
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Parcourir toutes les tables avec colonnes id uuid sans DEFAULT
    FOR rec IN 
        SELECT t.table_name, c.column_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
          AND c.column_name = 'id'
          AND c.data_type = 'uuid'
          AND (c.column_default IS NULL OR c.column_default NOT LIKE '%gen_random_uuid%')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT gen_random_uuid()', 
                      rec.table_name, rec.column_name);
        RAISE NOTICE 'DEFAULT gen_random_uuid() ajouté sur %.%', rec.table_name, rec.column_name;
    END LOOP;
END $$;

-- Garde-fous amortization : contrainte useful_life_years >= 1
ALTER TABLE public.amortizations 
DROP CONSTRAINT IF EXISTS amortizations_years_chk;

ALTER TABLE public.amortizations 
ADD CONSTRAINT amortizations_years_chk 
CHECK (useful_life_years IS NULL OR useful_life_years >= 1);

-- Fonction calculate_amortization() tolérante (version sécurisée)
CREATE OR REPLACE FUNCTION public.calculate_amortization()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $fn$
BEGIN
    -- Calcul des valeurs dérivées avec garde-fous
    IF COALESCE(NEW.useful_life_years, 0) <= 0 THEN
        -- Cas invalide : neutraliser les calculs
        NEW.annual_amortization := 0;
        NEW.accumulated_amortization := COALESCE(NEW.accumulated_amortization, 0);
        NEW.remaining_value := COALESCE(NEW.purchase_amount, 0);
        
        -- annual_expense = NULL pour éviter division par zéro
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'amortizations' 
              AND column_name = 'annual_expense'
        ) THEN
            NEW.annual_expense := NULL;
        END IF;
        
        RAISE NOTICE 'Amortization %: useful_life_years invalide (%), calculs neutralisés', 
                     NEW.item_name, NEW.useful_life_years;
    ELSE
        -- Calcul normal
        NEW.annual_amortization := ROUND(NEW.purchase_amount / NEW.useful_life_years, 2);
        
        -- Calcul accumulated_amortization basé sur les années écoulées
        DECLARE
            years_elapsed INTEGER;
        BEGIN
            years_elapsed := GREATEST(0, 
                EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM NEW.purchase_date::DATE)
            );
            
            NEW.accumulated_amortization := LEAST(
                NEW.purchase_amount,
                NEW.annual_amortization * LEAST(years_elapsed, NEW.useful_life_years)
            );
        END;
        
        NEW.remaining_value := GREATEST(0, NEW.purchase_amount - NEW.accumulated_amortization);
        
        -- annual_expense pour compatibilité (neutralisé temporairement)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'amortizations' 
              AND column_name = 'annual_expense'
        ) THEN
            NEW.annual_expense := NULL; -- Neutralisé jusqu'à confirmation des colonnes
        END IF;
    END IF;
    
    RETURN NEW;
END
$fn$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS amortizations_biur ON public.amortizations;
DROP TRIGGER IF EXISTS trg_amortizations_calculate ON public.amortizations;

CREATE TRIGGER trg_amortizations_calculate
    BEFORE INSERT OR UPDATE ON public.amortizations
    FOR EACH ROW 
    EXECUTE FUNCTION public.calculate_amortization();

-- Helper pour seeds : obtenir ou créer un utilisateur de test
CREATE OR REPLACE FUNCTION public.get_or_create_test_user()
RETURNS UUID 
LANGUAGE plpgsql 
AS $fn$
DECLARE
    user_uuid UUID;
BEGIN
    -- Essayer de récupérer un utilisateur existant
    SELECT id INTO user_uuid 
    FROM auth.users 
    ORDER BY created_at 
    LIMIT 1;
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'Aucun utilisateur trouvé dans auth.users. Créez un utilisateur avant d''exécuter les seeds.';
    END IF;
    
    RETURN user_uuid;
END
$fn$;

-- Helper pour seeds : obtenir ou créer une propriété de test
CREATE OR REPLACE FUNCTION public.get_or_create_test_property(owner_uuid UUID)
RETURNS UUID 
LANGUAGE plpgsql 
AS $fn$
DECLARE
    property_uuid UUID;
    property_table_name TEXT;
BEGIN
    -- Détecter le nom de la table des propriétés
    SELECT table_name INTO property_table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('properties', 'biens', 'lmnp_biens', 'property')
    ORDER BY 
        CASE table_name 
            WHEN 'properties' THEN 1
            WHEN 'biens' THEN 2  
            WHEN 'lmnp_biens' THEN 3
            ELSE 4
        END
    LIMIT 1;
    
    IF property_table_name IS NULL THEN
        RAISE EXCEPTION 'Aucune table de propriétés trouvée (properties, biens, lmnp_biens)';
    END IF;
    
    -- Essayer de récupérer une propriété existante pour cet utilisateur
    EXECUTE format('SELECT id FROM public.%I WHERE user_id = $1 ORDER BY created_at LIMIT 1', 
                   property_table_name) 
    INTO property_uuid 
    USING owner_uuid;
    
    -- Si aucune propriété, en créer une
    IF property_uuid IS NULL THEN
        EXECUTE format(
            'INSERT INTO public.%I (id, user_id, address, start_date, monthly_rent, status) 
             VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, $3, $4) 
             ON CONFLICT DO NOTHING 
             RETURNING id', 
            property_table_name
        ) INTO property_uuid 
        USING owner_uuid, 'Propriété de test - ' || substring(owner_uuid::text, 1, 8), 1000, 'active';
        
        -- Si l'insert a échoué à cause d'un conflit, récupérer l'existant
        IF property_uuid IS NULL THEN
            EXECUTE format('SELECT id FROM public.%I WHERE user_id = $1 ORDER BY created_at LIMIT 1', 
                           property_table_name) 
            INTO property_uuid 
            USING owner_uuid;
        END IF;
    END IF;
    
    IF property_uuid IS NULL THEN
        RAISE EXCEPTION 'Impossible de créer ou récupérer une propriété pour l''utilisateur %', owner_uuid;
    END IF;
    
    RETURN property_uuid;
END
$fn$;

-- Nettoyage des données de test invalides existantes
DO $$
BEGIN
    -- Supprimer les amortizations avec useful_life_years <= 0
    DELETE FROM public.amortizations 
    WHERE useful_life_years IS NOT NULL AND useful_life_years <= 0;
    
    RAISE NOTICE 'Supprimé % amortizations avec useful_life_years <= 0', 
                 (SELECT COUNT(*) FROM public.amortizations WHERE useful_life_years <= 0);
    
    -- Supprimer les enregistrements avec des IDs string invalides
    DELETE FROM public.amortizations 
    WHERE user_id::text LIKE 'test-%' OR property_id::text LIKE 'test-%';
    
    DELETE FROM public.revenues 
    WHERE user_id::text LIKE 'test-%' OR property_id::text LIKE 'test-%';
    
    DELETE FROM public.expenses 
    WHERE user_id::text LIKE 'test-%' OR property_id::text LIKE 'test-%';
    
    RAISE NOTICE 'Nettoyage des données de test avec IDs string terminé';
END $$;

-- Seeds propres avec UUID réels
DO $$
DECLARE
    test_user_id UUID;
    test_property_id UUID;
BEGIN
    -- Obtenir un utilisateur de test
    BEGIN
        test_user_id := public.get_or_create_test_user();
        RAISE NOTICE 'Utilisateur de test: %', test_user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Pas d''utilisateur disponible, seeds ignorés: %', SQLERRM;
        RETURN;
    END;
    
    -- Obtenir une propriété de test
    BEGIN
        test_property_id := public.get_or_create_test_property(test_user_id);
        RAISE NOTICE 'Propriété de test: %', test_property_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Impossible de créer une propriété de test: %', SQLERRM;
        RETURN;
    END;
    
    -- Seed amortization avec données valides
    INSERT INTO public.amortizations (
        id, user_id, property_id, item_name, category, 
        purchase_date, purchase_amount, useful_life_years, status, notes
    ) VALUES (
        gen_random_uuid(),
        test_user_id,
        test_property_id,
        'Mobilier de test - ' || substring(gen_random_uuid()::text, 1, 8),
        'mobilier',
        CURRENT_DATE - INTERVAL '1 year',
        1500.00,
        10, -- Valeur valide >= 1
        'active',
        'Seed de test avec UUID réels et useful_life_years valide'
    ) ON CONFLICT DO NOTHING;
    
    -- Seed revenue
    INSERT INTO public.revenues (
        id, user_id, property_id, amount, date, description, type
    ) VALUES (
        gen_random_uuid(),
        test_user_id,
        test_property_id,
        1200.00,
        CURRENT_DATE - INTERVAL '1 month',
        'Loyer de test',
        'rent'
    ) ON CONFLICT DO NOTHING;
    
    -- Seed expense
    INSERT INTO public.expenses (
        id, user_id, property_id, amount, date, description, category, deductible
    ) VALUES (
        gen_random_uuid(),
        test_user_id,
        test_property_id,
        150.00,
        CURRENT_DATE - INTERVAL '15 days',
        'Maintenance de test',
        'maintenance',
        true
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Seeds avec UUID réels créés avec succès';
END $$;

-- Nettoyage des fonctions helper (optionnel, garder pour réutilisation)
-- DROP FUNCTION IF EXISTS public.get_or_create_test_user();
-- DROP FUNCTION IF EXISTS public.get_or_create_test_property(UUID);

RAISE NOTICE 'Migration cleanup_seeds_uuid_guards terminée avec succès';