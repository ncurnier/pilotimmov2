#!/bin/bash

# Script de test SQL pour PilotImmo
# Exécute les smoke tests et seeds sur la base de données

set -e

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Variable DATABASE_URL non définie"
  echo "Définissez-la avec: export DATABASE_URL='postgresql://...'"
  exit 1
fi

echo "🧪 Exécution des tests SQL..."
echo "Base de données: $(echo $DATABASE_URL | sed 's/:[^:]*@/@***@/')"

# Exécuter le seed de développement
echo ""
echo "🌱 Exécution du seed de développement..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/seed_dev_amortization.sql

# Exécuter le smoke test principal
echo ""
echo "📋 Test de validation des placeholders..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/smoke_test_placeholders.sql

echo ""
echo "✅ Tous les tests SQL sont passés avec succès!"
echo "✅ Aucun placeholder string détecté"
echo "✅ Toutes les contraintes respectées"