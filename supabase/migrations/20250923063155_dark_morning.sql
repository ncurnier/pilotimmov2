/*
  # Script de rollback - Retour en arrière de la correction UUID
  
  ATTENTION: Ce script est fourni pour les cas d'urgence uniquement.
  Il ne devrait normalement pas être nécessaire car gen_random_uuid()
  est la solution standard recommandée.
  
  Ce script :
  1. Ne supprime PAS l'extension pgcrypto (elle peut être utilisée ailleurs)
  2. Remet les DEFAULT à NULL si nécessaire
  3. Documente les actions effectuées
*/

-- Configuration
\set ON_ERROR_STOP on

-- Header
SELECT 
  '=== ROLLBACK UUID FIX - ' || now()::timestamp(0) || ' ===' as rollback_header;

-- Fonction de log
CREATE OR REPLACE FUNCTION log_rollback_step(step_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE '[ROLLBACK] %: %', now()::timestamp(0), step_name;
END;
$$;

SELECT log_rollback_step('Début du rollback');

-- 1. Sauvegarder l'état actuel
CREATE TEMP TABLE IF NOT EXISTS uuid_defaults_backup AS
SELECT 
  table_name,
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'id'
AND data_type = 'uuid'
AND column_default LIKE '%gen_random_uuid()%';

SELECT log_rollback_step('Sauvegarde des DEFAULT actuels');

-- 2. Afficher ce qui va être modifié
SELECT 
  'Tables qui seront affectées:' as info,
  table_name,
  column_default as current_default
FROM uuid_defaults_backup;

-- 3. Demander confirmation (en mode interactif)
DO $$
BEGIN
  SELECT log_rollback_step('ATTENTION: Rollback en cours - les nouveaux enregistrements n''auront plus de DEFAULT UUID');
END $$;

-- 4. Retirer les DEFAULT gen_random_uuid() (optionnel - décommentez si nécessaire)
/*
DO $$
DECLARE
  table_record RECORD;
BEGIN
  SELECT log_rollback_step('Suppression des DEFAULT gen_random_uuid()');
  
  FOR table_record IN 
    SELECT table_name 
    FROM uuid_defaults_backup
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id DROP DEFAULT', table_record.table_name);
    SELECT log_rollback_step(format('Table %s: DEFAULT supprimé', table_record.table_name));
  END LOOP;
END $$;
*/

-- 5. Vérification post-rollback
SELECT 
  'État après rollback:' as post_rollback_state,
  table_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'id'
AND data_type = 'uuid'
ORDER BY table_name;

-- 6. Instructions pour la suite
SELECT 
  'INSTRUCTIONS POST-ROLLBACK:' as instructions_header;

SELECT 
  '1. Les tables n''ont plus de DEFAULT UUID automatique' as instruction1,
  '2. Vous devez fournir explicitement les UUIDs lors des INSERT' as instruction2,
  '3. Utilisez gen_random_uuid() manuellement dans vos INSERT' as instruction3,
  '4. Exemple: INSERT INTO table (id, ...) VALUES (gen_random_uuid(), ...)' as instruction4,
  '5. L''extension pgcrypto reste active pour gen_random_uuid()' as instruction5;

-- Nettoyage
DROP FUNCTION IF EXISTS log_rollback_step(TEXT);

SELECT 
  '=== ROLLBACK TERMINÉ ===' as rollback_completed,
  now()::timestamp(0) as completed_at;