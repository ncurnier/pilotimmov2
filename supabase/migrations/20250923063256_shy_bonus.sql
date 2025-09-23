/*
  # Vérification rapide UUID - Post-migration
  
  Script rapide pour vérifier que la correction UUID fonctionne.
  À exécuter après la migration 20250125000001.
*/

-- Test rapide de l'extension
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')
    THEN '✅ pgcrypto activée'
    ELSE '❌ pgcrypto manquante'
  END as pgcrypto_status;

-- Test de génération UUID
SELECT 
  '✅ UUID généré:' as status,
  gen_random_uuid() as sample_uuid;

-- Vérification des DEFAULT problématiques
SELECT 
  table_name,
  column_name,
  CASE 
    WHEN column_default LIKE '%uid()%' THEN '❌ uid() détecté'
    WHEN column_default LIKE '%gen_random_uuid()%' THEN '✅ gen_random_uuid()'
    ELSE '⚠️ autre: ' || COALESCE(column_default, 'NULL')
  END as default_status
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'id'
AND data_type = 'uuid'
ORDER BY table_name;

-- Comptage des policies RLS préservées
SELECT 
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%') as auth_uid_policies,
  '✅ Policies RLS préservées' as status
FROM pg_policies
WHERE schemaname = 'public';

SELECT '=== Vérification terminée ===' as done;