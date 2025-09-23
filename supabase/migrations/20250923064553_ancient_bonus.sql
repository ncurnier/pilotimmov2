-- Script de smoke test : UUID + Amortization
-- Vérifie que tous les garde-fous sont en place et fonctionnels

\echo '=== SMOKE TEST UUID + AMORTIZATION ==='

-- 1. Vérifier l'extension pgcrypto
\echo '1. Vérification extension pgcrypto:'
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')
    THEN '✅ pgcrypto activée'
    ELSE '❌ pgcrypto manquante'
    END as status;

-- 2. Vérifier gen_random_uuid() fonctionne
\echo '2. Test génération UUID:'
SELECT 
    gen_random_uuid() as test_uuid,
    '✅ gen_random_uuid() fonctionnel' as status;

-- 3. Vérifier les DEFAULT sur colonnes id uuid
\echo '3. Vérification DEFAULT gen_random_uuid():'
SELECT 
    table_name,
    column_name,
    CASE WHEN column_default LIKE '%gen_random_uuid%'
    THEN '✅ DEFAULT OK'
    ELSE '❌ DEFAULT manquant: ' || COALESCE(column_default, 'NULL')
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'id'
  AND data_type = 'uuid'
ORDER BY table_name;

-- 4. Vérifier qu'aucun uid() problématique ne reste
\echo '4. Vérification absence de uid() problématique:'
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE column_default LIKE '%uid()%'
          AND table_schema = 'public'
    )
    THEN '❌ uid() trouvé dans DEFAULT'
    ELSE '✅ Aucun uid() problématique'
    END as status;

-- 5. Test amortization avec useful_life_years = 0 (doit être rejeté par contrainte)
\echo '5. Test contrainte useful_life_years >= 1:'
DO $$
DECLARE
    test_user_id UUID;
    test_property_id UUID;
BEGIN
    -- Obtenir des IDs réels
    SELECT id INTO test_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️  Aucun utilisateur dans auth.users, test ignoré';
        RETURN;
    END IF;
    
    -- Obtenir une propriété
    SELECT id INTO test_property_id 
    FROM (
        SELECT id FROM public.properties WHERE user_id::text = test_user_id::text
        UNION ALL
        SELECT id FROM public.biens WHERE user_id::text = test_user_id::text
        UNION ALL  
        SELECT id FROM public.lmnp_biens WHERE user_id::text = test_user_id::text
    ) t
    LIMIT 1;
    
    IF test_property_id IS NULL THEN
        RAISE NOTICE '⚠️  Aucune propriété trouvée, test ignoré';
        RETURN;
    END IF;
    
    -- Test avec useful_life_years = 0 (doit échouer)
    BEGIN
        INSERT INTO public.amortizations (
            user_id, property_id, item_name, category, 
            purchase_date, purchase_amount, useful_life_years
        ) VALUES (
            test_user_id, test_property_id, 'Test ZERO', 'mobilier',
            CURRENT_DATE, 500, 0
        );
        RAISE NOTICE '❌ Contrainte useful_life_years >= 1 non respectée';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ Contrainte useful_life_years >= 1 fonctionne';
    END;
END $$;

-- 6. Test amortization avec useful_life_years = 10 (doit fonctionner)
\echo '6. Test amortization valide (years=10):'
DO $$
DECLARE
    test_user_id UUID;
    test_property_id UUID;
    inserted_id UUID;
BEGIN
    -- Obtenir des IDs réels
    SELECT id INTO test_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️  Aucun utilisateur dans auth.users, test ignoré';
        RETURN;
    END IF;
    
    -- Obtenir une propriété
    SELECT id INTO test_property_id 
    FROM (
        SELECT id FROM public.properties WHERE user_id::text = test_user_id::text
        UNION ALL
        SELECT id FROM public.biens WHERE user_id::text = test_user_id::text
        UNION ALL  
        SELECT id FROM public.lmnp_biens WHERE user_id::text = test_user_id::text
    ) t
    LIMIT 1;
    
    IF test_property_id IS NULL THEN
        RAISE NOTICE '⚠️  Aucune propriété trouvée, test ignoré';
        RETURN;
    END IF;
    
    -- Test avec useful_life_years = 10 (doit fonctionner)
    INSERT INTO public.amortizations (
        user_id, property_id, item_name, category, 
        purchase_date, purchase_amount, useful_life_years
    ) VALUES (
        test_user_id, test_property_id, 'Test OK', 'mobilier',
        CURRENT_DATE, 1000, 10
    ) RETURNING id INTO inserted_id;
    
    IF inserted_id IS NOT NULL THEN
        RAISE NOTICE '✅ Amortization valide créé: %', inserted_id;
        
        -- Vérifier les calculs
        SELECT 
            useful_life_years,
            annual_amortization,
            CASE WHEN annual_amortization = ROUND(purchase_amount / useful_life_years, 2)
            THEN '✅ Calcul annual_amortization correct'
            ELSE '❌ Calcul annual_amortization incorrect'
            END as calc_status
        FROM public.amortizations 
        WHERE id = inserted_id;
        
    ELSE
        RAISE NOTICE '❌ Échec création amortization valide';
    END IF;
END $$;

-- 7. Vérifier les contraintes de qualité
\echo '7. Vérification contraintes de qualité:'
SELECT 
    constraint_name,
    '✅ Contrainte active: ' || pg_get_constraintdef(oid) as status
FROM pg_constraint 
WHERE conrelid = 'public.amortizations'::regclass
  AND constraint_name LIKE '%years%';

-- 8. Test auto-génération UUID sur INSERT sans id
\echo '8. Test auto-génération UUID:'
DO $$
DECLARE
    test_user_id UUID;
    test_property_id UUID;
    auto_id UUID;
BEGIN
    -- Obtenir des IDs réels
    SELECT id INTO test_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️  Aucun utilisateur dans auth.users, test ignoré';
        RETURN;
    END IF;
    
    -- Obtenir une propriété
    SELECT id INTO test_property_id 
    FROM (
        SELECT id FROM public.properties WHERE user_id::text = test_user_id::text
        UNION ALL
        SELECT id FROM public.biens WHERE user_id::text = test_user_id::text
        UNION ALL  
        SELECT id FROM public.lmnp_biens WHERE user_id::text = test_user_id::text
    ) t
    LIMIT 1;
    
    IF test_property_id IS NULL THEN
        RAISE NOTICE '⚠️  Aucune propriété trouvée, test ignoré';
        RETURN;
    END IF;
    
    -- Insert sans id explicite (doit auto-générer)
    INSERT INTO public.amortizations (
        user_id, property_id, item_name, category, 
        purchase_date, purchase_amount, useful_life_years
    ) VALUES (
        test_user_id, test_property_id, 'Test AUTO-UUID', 'mobilier',
        CURRENT_DATE, 750, 5
    ) RETURNING id INTO auto_id;
    
    IF auto_id IS NOT NULL THEN
        RAISE NOTICE '✅ UUID auto-généré: %', auto_id;
    ELSE
        RAISE NOTICE '❌ Échec auto-génération UUID';
    END IF;
END $$;

-- 9. Nettoyage des données de test
\echo '9. Nettoyage des données de test:'
DELETE FROM public.amortizations 
WHERE item_name LIKE 'Test %' OR item_name LIKE '%test%';

SELECT '✅ Données de test nettoyées' as status;

\echo '=== FIN SMOKE TEST ==='
\echo 'Si tous les tests affichent ✅, la migration est réussie.'