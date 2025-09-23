/*
  # Correction division par zéro - Amortissements LMNP

  1. Contraintes
    - Ajouter CHECK sur useful_life_years > 0
    - Contraintes sur montants positifs

  2. Fonction de calcul
    - Fonction IMMUTABLE pour calcul sécurisé
    - Gestion des cas limites (years <= 0)

  3. Trigger de calcul
    - Remplacement de la colonne générée
    - Calcul automatique avec arrondi

  4. Sécurité
    - Prévention des erreurs 22012
    - Validation des données
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fonction de calcul d'amortissement sécurisée
CREATE OR REPLACE FUNCTION amortization_annual(
  base_amount NUMERIC,
  salvage_value NUMERIC DEFAULT 0,
  years INTEGER DEFAULT 1
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Validation des paramètres
  IF years IS NULL OR years <= 0 THEN
    RETURN NULL;
  END IF;
  
  IF base_amount IS NULL OR base_amount < 0 THEN
    RETURN NULL;
  END IF;
  
  IF salvage_value IS NULL THEN
    salvage_value := 0;
  END IF;
  
  -- Calcul avec protection contre valeurs négatives
  RETURN ROUND(GREATEST(base_amount - salvage_value, 0) / years, 2);
END;
$$;

-- Fonction pour calculer la valeur résiduelle
CREATE OR REPLACE FUNCTION calculate_remaining_value(
  base_amount NUMERIC,
  accumulated_amortization NUMERIC DEFAULT 0
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF base_amount IS NULL OR accumulated_amortization IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN GREATEST(base_amount - accumulated_amortization, 0);
END;
$$;

-- Fonction trigger pour mise à jour automatique
CREATE OR REPLACE FUNCTION calculate_amortization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calcul de l'amortissement annuel
  NEW.annual_amortization := amortization_annual(
    NEW.purchase_amount,
    0, -- salvage_value par défaut à 0 pour LMNP
    NEW.useful_life_years
  );
  
  -- Calcul de la valeur résiduelle
  NEW.remaining_value := calculate_remaining_value(
    NEW.purchase_amount,
    COALESCE(NEW.accumulated_amortization, 0)
  );
  
  -- Mise à jour du timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$;

-- Modification de la table amortizations
DO $$
BEGIN
  -- Supprimer la colonne générée si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'amortizations' 
    AND column_name = 'annual_expense'
    AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE amortizations DROP COLUMN annual_expense;
  END IF;
  
  -- Ajouter les colonnes si elles n'existent pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'amortizations' AND column_name = 'annual_amortization'
  ) THEN
    ALTER TABLE amortizations ADD COLUMN annual_amortization NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'amortizations' AND column_name = 'accumulated_amortization'
  ) THEN
    ALTER TABLE amortizations ADD COLUMN accumulated_amortization NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'amortizations' AND column_name = 'remaining_value'
  ) THEN
    ALTER TABLE amortizations ADD COLUMN remaining_value NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;

-- Ajouter les contraintes CHECK
DO $$
BEGIN
  -- Contrainte sur useful_life_years
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'amortizations_useful_life_years_check'
  ) THEN
    ALTER TABLE amortizations 
    ADD CONSTRAINT amortizations_useful_life_years_check 
    CHECK (useful_life_years > 0);
  END IF;
  
  -- Contrainte sur purchase_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'amortizations_purchase_amount_check'
  ) THEN
    ALTER TABLE amortizations 
    ADD CONSTRAINT amortizations_purchase_amount_check 
    CHECK (purchase_amount >= 0);
  END IF;
  
  -- Contrainte sur annual_amortization
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'amortizations_annual_amortization_check'
  ) THEN
    ALTER TABLE amortizations 
    ADD CONSTRAINT amortizations_annual_amortization_check 
    CHECK (annual_amortization >= 0);
  END IF;
  
  -- Contrainte sur accumulated_amortization
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'amortizations_accumulated_amortization_check'
  ) THEN
    ALTER TABLE amortizations 
    ADD CONSTRAINT amortizations_accumulated_amortization_check 
    CHECK (accumulated_amortization >= 0);
  END IF;
  
  -- Contrainte sur remaining_value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'amortizations_remaining_value_check'
  ) THEN
    ALTER TABLE amortizations 
    ADD CONSTRAINT amortizations_remaining_value_check 
    CHECK (remaining_value >= 0);
  END IF;
  
  -- Contrainte logique : accumulated <= purchase
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'amortizations_amounts_check'
  ) THEN
    ALTER TABLE amortizations 
    ADD CONSTRAINT amortizations_amounts_check 
    CHECK (accumulated_amortization <= purchase_amount);
  END IF;
  
  -- Contrainte logique : remaining = purchase - accumulated
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'amortizations_remaining_check'
  ) THEN
    ALTER TABLE amortizations 
    ADD CONSTRAINT amortizations_remaining_check 
    CHECK (remaining_value = purchase_amount - accumulated_amortization);
  END IF;
END $$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trg_amortizations_calculate ON amortizations;
CREATE TRIGGER trg_amortizations_calculate
  BEFORE INSERT OR UPDATE ON amortizations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_amortization();

-- Mettre à jour les enregistrements existants
UPDATE amortizations 
SET 
  annual_amortization = amortization_annual(purchase_amount, 0, useful_life_years),
  remaining_value = calculate_remaining_value(purchase_amount, accumulated_amortization)
WHERE useful_life_years > 0;

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_amortizations_user_id ON amortizations(user_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_property_id ON amortizations(property_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_purchase_date ON amortizations(purchase_date);
CREATE INDEX IF NOT EXISTS idx_amortizations_status ON amortizations(status);
CREATE INDEX IF NOT EXISTS idx_amortizations_category ON amortizations(category);