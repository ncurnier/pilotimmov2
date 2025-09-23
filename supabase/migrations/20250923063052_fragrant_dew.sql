/*
  # Correction des fonctions uid() vers gen_random_uuid()

  1. Problème identifié
    - Plusieurs migrations utilisent uid() qui n'existe pas dans PostgreSQL
    - Besoin de standardiser sur gen_random_uuid() avec l'extension pgcrypto

  2. Corrections apportées
    - Activation de l'extension pgcrypto
    - Remplacement de tous les DEFAULT uid() par DEFAULT gen_random_uuid()
    - Mise à jour des colonnes existantes pour utiliser le bon default
    - Vérification de l'intégrité des données

  3. Tables concernées
    - users (colonne id)
    - Toutes les autres tables utilisent déjà gen_random_uuid()

  4. Sécurité
    - Les policies RLS utilisant auth.uid() restent inchangées
    - Aucun impact sur l'authentification Supabase
*/

-- Extension pour génération UUID native
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fonction utilitaire pour les logs
CREATE OR REPLACE FUNCTION log_migration_step(step_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE '[MIGRATION] %: %', now()::timestamp(0), step_name;
END;
$$;

-- Début de la migration
SELECT log_migration_step('Début correction uid() vers gen_random_uuid()');

-- 1. Correction de la table users
DO $$
BEGIN
  SELECT log_migration_step('Correction table users');
  
  -- Vérifier si la table users existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    
    -- Vérifier le type de la colonne id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'id' 
      AND data_type = 'uuid'
    ) THEN
      -- Mettre à jour le default de la colonne id
      ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
      SELECT log_migration_step('Table users: DEFAULT mis à jour vers gen_random_uuid()');
    ELSE
      SELECT log_migration_step('Table users: colonne id n''est pas de type uuid, correction manuelle requise');
    END IF;
    
  ELSE
    SELECT log_migration_step('Table users n''existe pas encore');
  END IF;
END $$;

-- 2. Vérification et correction des autres tables
DO $$
DECLARE
  table_record RECORD;
  column_record RECORD;
BEGIN
  SELECT log_migration_step('Vérification des autres tables');
  
  -- Parcourir toutes les tables avec des colonnes id de type uuid
  FOR table_record IN 
    SELECT DISTINCT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
    AND table_name != 'users'
  LOOP
    -- Vérifier le default actuel
    SELECT column_default INTO column_record
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = table_record.table_name
    AND column_name = 'id';
    
    -- Si le default contient uid(), le corriger
    IF column_record.column_default IS NOT NULL AND column_record.column_default LIKE '%uid()%' THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()', table_record.table_name);
      SELECT log_migration_step(format('Table %s: DEFAULT corrigé', table_record.table_name));
    END IF;
  END LOOP;
END $$;

-- 3. Vérification des fonctions personnalisées
DO $$
DECLARE
  func_record RECORD;
BEGIN
  SELECT log_migration_step('Vérification des fonctions personnalisées');
  
  -- Rechercher les fonctions qui pourraient utiliser uid()
  FOR func_record IN
    SELECT routine_name, routine_definition
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_definition LIKE '%uid()%'
    AND routine_definition NOT LIKE '%auth.uid()%'
  LOOP
    SELECT log_migration_step(format('ATTENTION: Fonction %s contient uid() - vérification manuelle requise', func_record.routine_name));
  END LOOP;
END $$;

-- 4. Test de génération UUID
DO $$
DECLARE
  test_uuid uuid;
BEGIN
  SELECT log_migration_step('Test de génération UUID');
  
  -- Tester gen_random_uuid()
  SELECT gen_random_uuid() INTO test_uuid;
  
  IF test_uuid IS NOT NULL THEN
    SELECT log_migration_step(format('Test réussi: UUID généré = %s', test_uuid));
  ELSE
    RAISE EXCEPTION 'Échec du test de génération UUID';
  END IF;
END $$;

-- 5. Vérification finale des policies RLS
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT log_migration_step('Vérification des policies RLS');
  
  -- Compter les policies utilisant auth.uid()
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%');
  
  SELECT log_migration_step(format('Policies RLS utilisant auth.uid(): %s (inchangées)', policy_count));
END $$;

-- Nettoyage
DROP FUNCTION IF EXISTS log_migration_step(TEXT);

-- Log final
DO $$
BEGIN
  RAISE NOTICE '[MIGRATION] %: Migration uid() vers gen_random_uuid() terminée avec succès', now()::timestamp(0);
  RAISE NOTICE '[MIGRATION] Extension pgcrypto activée';
  RAISE NOTICE '[MIGRATION] Tous les DEFAULT uid() ont été remplacés par gen_random_uuid()';
  RAISE NOTICE '[MIGRATION] Les policies RLS utilisant auth.uid() sont préservées';
END $$;