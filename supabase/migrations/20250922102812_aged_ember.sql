/*
  # Création de la table amortizations (amortissements LMNP)

  1. Nouvelle table amortizations
    - Conforme aux règles fiscales LMNP
    - Calculs automatiques d'amortissement
    - Rattachement aux propriétés
    
  2. Règles LMNP
    - Durées d'amortissement réglementaires
    - Calcul automatique de l'amortissement annuel
    - Suivi de la valeur résiduelle
    
  3. Sécurité
    - RLS activé
    - Policies basées sur auth.uid()
    
  4. Triggers
    - updated_at automatique
*/

-- Extension pour génération UUID native
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table des amortissements LMNP
CREATE TABLE IF NOT EXISTS amortizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  property_id uuid NOT NULL,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'mobilier' 
    CHECK (category IN ('mobilier', 'electromenager', 'informatique', 'travaux', 'amenagement', 'autre')),
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  purchase_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (purchase_amount >= 0),
  useful_life_years integer NOT NULL DEFAULT 10 CHECK (useful_life_years > 0),
  annual_amortization numeric(12,2) NOT NULL DEFAULT 0 CHECK (annual_amortization >= 0),
  accumulated_amortization numeric(12,2) NOT NULL DEFAULT 0 CHECK (accumulated_amortization >= 0),
  remaining_value numeric(12,2) NOT NULL DEFAULT 0 CHECK (remaining_value >= 0),
  status text NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'completed', 'disposed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT amortizations_property_id_fkey 
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT amortizations_amounts_check 
    CHECK (accumulated_amortization <= purchase_amount),
  CONSTRAINT amortizations_remaining_check 
    CHECK (remaining_value = purchase_amount - accumulated_amortization)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_amortizations_user_id ON amortizations(user_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_property_id ON amortizations(property_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_category ON amortizations(category);
CREATE INDEX IF NOT EXISTS idx_amortizations_status ON amortizations(status);
CREATE INDEX IF NOT EXISTS idx_amortizations_purchase_date ON amortizations(purchase_date);

-- Fonction pour calculer l'amortissement annuel
CREATE OR REPLACE FUNCTION calculate_amortization()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Calculer l'amortissement annuel
  NEW.annual_amortization := NEW.purchase_amount / NEW.useful_life_years;
  
  -- Calculer la valeur résiduelle
  NEW.remaining_value := NEW.purchase_amount - NEW.accumulated_amortization;
  
  -- Mettre à jour updated_at
  NEW.updated_at := now();
  
  RETURN NEW;
END$$;

-- Trigger pour les calculs automatiques
DROP TRIGGER IF EXISTS trg_amortizations_calculate ON amortizations;
CREATE TRIGGER trg_amortizations_calculate
  BEFORE INSERT OR UPDATE ON amortizations
  FOR EACH ROW EXECUTE FUNCTION calculate_amortization();

-- Activer RLS
ALTER TABLE amortizations ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DROP POLICY IF EXISTS "amortizations_select_own" ON amortizations;
CREATE POLICY "amortizations_select_own"
  ON amortizations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "amortizations_insert_own" ON amortizations;
CREATE POLICY "amortizations_insert_own"
  ON amortizations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "amortizations_update_own" ON amortizations;
CREATE POLICY "amortizations_update_own"
  ON amortizations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "amortizations_delete_own" ON amortizations;
CREATE POLICY "amortizations_delete_own"
  ON amortizations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);