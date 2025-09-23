/*
  # Correction des fonctions uid() et standardisation des IDs LMNP

  1. Extensions
    - Activation de pgcrypto pour gen_random_uuid()
    
  2. Fonctions utilitaires
    - Fonction set_updated_at() pour les triggers
    
  3. Corrections des tables existantes
    - Remplacement des uid() par auth.uid() dans les policies
    - Standardisation des colonnes user_id
    
  4. Sécurité
    - Vérification et activation RLS sur toutes les tables
    - Policies cohérentes basées sur auth.uid()
*/

-- Extension pour génération UUID native
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fonction utilitaire pour updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

-- Correction de la table users (remplacer uid par user_id pour éviter confusion)
DO $$
BEGIN
  -- Vérifier si la colonne uid existe et la renommer si nécessaire
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'uid'
  ) THEN
    -- Supprimer les policies existantes
    DROP POLICY IF EXISTS "Users can insert own data" ON users;
    DROP POLICY IF EXISTS "Users can read own data" ON users;
    DROP POLICY IF EXISTS "Users can update own data" ON users;
    
    -- Renommer uid en user_id pour plus de clarté
    ALTER TABLE users RENAME COLUMN uid TO user_id;
    
    -- Recréer les policies avec auth.uid()
    CREATE POLICY "Users can insert own data"
      ON users FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can read own data"
      ON users FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can update own data"
      ON users FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- Correction de la table properties
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
    -- Activer RLS si pas déjà fait
    ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
    
    -- Supprimer et recréer les policies
    DROP POLICY IF EXISTS "Users can insert own properties" ON properties;
    DROP POLICY IF EXISTS "Users can read own properties" ON properties;
    DROP POLICY IF EXISTS "Users can update own properties" ON properties;
    DROP POLICY IF EXISTS "Users can delete own properties" ON properties;
    
    CREATE POLICY "Users can insert own properties"
      ON properties FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can read own properties"
      ON properties FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can update own properties"
      ON properties FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can delete own properties"
      ON properties FOR DELETE
      TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- Correction de la table revenues
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenues') THEN
    ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can insert own revenues" ON revenues;
    DROP POLICY IF EXISTS "Users can read own revenues" ON revenues;
    DROP POLICY IF EXISTS "Users can update own revenues" ON revenues;
    DROP POLICY IF EXISTS "Users can delete own revenues" ON revenues;
    
    CREATE POLICY "Users can insert own revenues"
      ON revenues FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can read own revenues"
      ON revenues FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can update own revenues"
      ON revenues FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can delete own revenues"
      ON revenues FOR DELETE
      TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- Correction de la table expenses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
    DROP POLICY IF EXISTS "Users can read own expenses" ON expenses;
    DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
    DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
    
    CREATE POLICY "Users can insert own expenses"
      ON expenses FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can read own expenses"
      ON expenses FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can update own expenses"
      ON expenses FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can delete own expenses"
      ON expenses FOR DELETE
      TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- Correction de la table declarations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'declarations') THEN
    ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can insert own declarations" ON declarations;
    DROP POLICY IF EXISTS "Users can read own declarations" ON declarations;
    DROP POLICY IF EXISTS "Users can update own declarations" ON declarations;
    DROP POLICY IF EXISTS "Users can delete own declarations" ON declarations;
    
    CREATE POLICY "Users can insert own declarations"
      ON declarations FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can read own declarations"
      ON declarations FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can update own declarations"
      ON declarations FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can delete own declarations"
      ON declarations FOR DELETE
      TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- Correction de la table notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
    
    CREATE POLICY "Users can insert own notifications"
      ON notifications FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can read own notifications"
      ON notifications FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can update own notifications"
      ON notifications FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid()::text);
      
    CREATE POLICY "Users can delete own notifications"
      ON notifications FOR DELETE
      TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;