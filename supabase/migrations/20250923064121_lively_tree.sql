-- =============================================
-- SCRIPT DE SMOKE TEST - UUID + AMORTIZATION
-- =============================================

\echo '=== SMOKE TEST UUID + AMORTIZATION ==='
\echo ''

-- =============================================
-- 1. VÉRIFICATIONS EXTENSIONS
-- =============================================

\echo '1. Vérification des extensions:'
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname IN ('pgcrypto', 'uuid-ossp')
ORDER BY extname;

\echo ''

-- =============================================
-- 2. TEST GÉNÉRATION UUID
-- =============================================

\echo '2. Test génération UUID:'
SELECT 
    'gen_random_uuid()' as function_name,
    gen_random_uuid() as generated_uuid,
    length(gen_random_uuid()::text) as uuid_length;

\echo ''

-- =============================================
-- 3. VÉRIFICATION DEFAULT COLUMNS
-- =============================================

\echo '3. Vérification des DEFAULT sur colonnes id:'
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'id'
AND data_type = 'uuid'
ORDER BY table_name;

\echo ''

-- =============================================
-- 4. RECHERCHE uid() PROBLÉMATIQUES
-- =============================================

\echo '4. Recherche de uid() problématiques (hors auth.uid()):'
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_default LIKE '%uid()%'
AND column_default NOT LIKE '%auth.uid()%';

\echo ''

-- =============================================
-- 5. TEST AMORTIZATION - DIVISION PAR ZÉRO
-- =============================================

\echo '5. Test amortization avec useful_life_years = 0 (ne doit pas planter):'

-- Récupérer des IDs existants pour le test
\set test_user_id (SELECT user_id FROM public.users LIMIT 1)
\set test_property_id (SELECT id FROM public.properties LIMIT 1)

-- Test avec years=0 -> ne doit PAS lever d'erreur division par zéro
INSERT INTO public.amortizations (
    user_id, 
    property_id, 
    item_name, 
    category, 
    purchase_date, 
    purchase_amount, 
    useful_life_years
)
SELECT 
    u.user_id,
    p.id,
    'SMOKE TEST - ZERO years',
    'mobilier',
    CURRENT_DATE,
    500,
    0
FROM public.users u
CROSS JOIN public.properties p
LIMIT 1
ON CONFLICT DO NOTHING
RETURNING 
    item_name,
    useful_life_years,
    annual_expense,
    annual_amortization;

\echo ''

-- =============================================
-- 6. TEST AMORTIZATION - CAS NORMAL
-- =============================================

\echo '6. Test amortization avec useful_life_years = 10 (cas normal):'

INSERT INTO public.amortizations (
    user_id, 
    property_id, 
    item_name, 
    category, 
    purchase_date, 
    purchase_amount, 
    useful_life_years
)
SELECT 
    u.user_id,
    p.id,
    'SMOKE TEST - Normal case',
    'mobilier',
    CURRENT_DATE,
    1000,
    10
FROM public.users u
CROSS JOIN public.properties p
LIMIT 1
ON CONFLICT DO NOTHING
RETURNING 
    item_name,
    useful_life_years,
    purchase_amount,
    annual_amortization,
    annual_expense;

\echo ''

-- =============================================
-- 7. VÉRIFICATION CONTRAINTES
-- =============================================

\echo '7. Vérification des contraintes sur amortizations:'
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.amortizations'::regclass
AND contype = 'c'  -- CHECK constraints
ORDER BY conname;

\echo ''

-- =============================================
-- 8. TEST INSERT SANS ID (AUTO-GÉNÉRATION)
-- =============================================

\echo '8. Test insert sans id explicite (auto-génération UUID):'

-- Test sur table properties (doit générer un UUID automatiquement)
INSERT INTO public.properties (
    user_id, 
    address, 
    start_date, 
    monthly_rent
)
SELECT 
    user_id,
    'SMOKE TEST - Auto UUID - ' || gen_random_uuid()::text,
    CURRENT_DATE,
    750
FROM public.users
LIMIT 1
ON CONFLICT DO NOTHING
RETURNING 
    id,
    address,
    'UUID auto-généré' as status;

\echo ''

-- =============================================
-- 9. NETTOYAGE DES DONNÉES DE TEST
-- =============================================

\echo '9. Nettoyage des données de test:'

DELETE FROM public.amortizations 
WHERE item_name LIKE 'SMOKE TEST%';

DELETE FROM public.properties 
WHERE address LIKE 'SMOKE TEST%';

SELECT 'Données de test nettoyées' as cleanup_status;

\echo ''
\echo '=== SMOKE TEST TERMINÉ ==='
\echo ''
\echo 'Si aucune erreur ci-dessus, la migration UUID + amortization est OK !'