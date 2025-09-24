-- ============================================================================
-- Seed de développement pour les amortissements PilotImmo
-- ============================================================================
-- Ce script crée un jeu de données minimal pour travailler en local :
--   - Un utilisateur de démonstration (public.users)
--   - Une propriété rattachée à cet utilisateur (public.properties)
--   - Un amortissement valide lié à la propriété (public.amortizations)
--
-- Le script est entièrement idempotent et n'utilise aucune méta-commande psql.
-- ============================================================================

SELECT '🌱 Seed développement amortizations' AS info;

DO $$
DECLARE
  demo_uid constant text := 'demo-user-pilotimmo';
  demo_email constant text := 'demo@pilotimmo.dev';
  demo_user_id uuid;
  demo_property_id uuid;
  has_created_by boolean;
BEGIN
  -- Vérifier la présence des tables nécessaires
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE NOTICE '⚠️  Table public.users absente, seed annulé';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'properties'
  ) THEN
    RAISE NOTICE '⚠️  Table public.properties absente, seed annulé';
    RETURN;
  END IF;

  -- Récupérer ou créer l'utilisateur de démo
  SELECT id INTO demo_user_id
  FROM public.users
  WHERE uid = demo_uid
  LIMIT 1;

  IF demo_user_id IS NULL THEN
    INSERT INTO public.users (uid, email, display_name, subscription)
    VALUES (demo_uid, demo_email, 'Utilisateur Démo', 'free')
    RETURNING id INTO demo_user_id;

    RAISE NOTICE '✅ Utilisateur de démo créé (uid=%)', demo_uid;
  ELSE
    RAISE NOTICE 'ℹ️  Utilisateur de démo déjà présent (uid=%)', demo_uid;
  END IF;

  -- Vérifier la présence de la colonne created_by sur properties
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'properties'
      AND column_name = 'created_by'
  ) INTO has_created_by;

  -- Récupérer ou créer une propriété de démo
  SELECT id INTO demo_property_id
  FROM public.properties
  WHERE user_id = demo_uid
  ORDER BY created_at
  LIMIT 1;

  IF demo_property_id IS NULL THEN
    IF has_created_by THEN
      INSERT INTO public.properties (
        user_id, created_by, address, start_date, monthly_rent,
        status, description, type
      ) VALUES (
        demo_uid,
        demo_uid,
        '123 Rue du Smoke Test, 75000 Paris',
        CURRENT_DATE,
        950,
        'active',
        'Bien de démonstration créé par sql/seed_dev_amortization.sql',
        'apartment'
      )
      RETURNING id INTO demo_property_id;
    ELSE
      INSERT INTO public.properties (
        user_id, address, start_date, monthly_rent,
        status, description, type
      ) VALUES (
        demo_uid,
        '123 Rue du Smoke Test, 75000 Paris',
        CURRENT_DATE,
        950,
        'active',
        'Bien de démonstration créé par sql/seed_dev_amortization.sql',
        'apartment'
      )
      RETURNING id INTO demo_property_id;
    END IF;

    RAISE NOTICE '✅ Propriété de démo créée (id=%)', demo_property_id;
  ELSE
    RAISE NOTICE 'ℹ️  Propriété de démo déjà présente (id=%)', demo_property_id;
  END IF;

  -- Créer un amortissement de démo si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'amortizations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.amortizations
      WHERE property_id = demo_property_id
    ) THEN
      INSERT INTO public.amortizations (
        user_id,
        property_id,
        item_name,
        category,
        purchase_date,
        purchase_amount,
        useful_life_years,
        status,
        notes
      ) VALUES (
        demo_uid,
        demo_property_id,
        'Mobilier de démonstration',
        'mobilier',
        CURRENT_DATE - INTERVAL '180 days',
        2400,
        10,
        'active',
        'Créé automatiquement par sql/seed_dev_amortization.sql'
      );

      RAISE NOTICE '✅ Amortissement de démo créé pour la propriété %', demo_property_id;
    ELSE
      RAISE NOTICE 'ℹ️  Amortissement de démo déjà présent pour la propriété %', demo_property_id;
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Table public.amortizations absente, étape ignorée';
  END IF;
END;
$$;

SELECT '✅ Seed développement terminé' AS status;
