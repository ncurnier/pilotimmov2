/*
  # Ajout de la table des amortissements LMNP

  1. Nouvelle table
    - `amortizations`
      - `id` (uuid, primary key)
      - `user_id` (text, foreign key vers users)
      - `property_id` (uuid, foreign key vers properties)
      - `item_name` (text) - nom du bien/équipement
      - `category` (text) - mobilier, électroménager, travaux, etc.
      - `purchase_date` (date)
      - `purchase_amount` (numeric)
      - `useful_life_years` (integer) - durée d'amortissement
      - `annual_amortization` (numeric) - montant annuel calculé
      - `accumulated_amortization` (numeric) - cumul des amortissements
      - `remaining_value` (numeric) - valeur résiduelle
      - `status` (text: 'active', 'completed', 'disposed')
      - `notes` (text, optionnel)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur `amortizations`
    - Politiques pour les utilisateurs authentifiés
*/

CREATE TABLE IF NOT EXISTS amortizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'mobilier' CHECK (category IN ('mobilier', 'electromenager', 'informatique', 'travaux', 'amenagement', 'autre')),
  purchase_date date NOT NULL,
  purchase_amount numeric NOT NULL DEFAULT 0,
  useful_life_years integer NOT NULL DEFAULT 5,
  annual_amortization numeric NOT NULL DEFAULT 0,
  accumulated_amortization numeric NOT NULL DEFAULT 0,
  remaining_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disposed')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE amortizations ENABLE ROW LEVEL SECURITY;

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_amortizations_user_id ON amortizations(user_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_property_id ON amortizations(property_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_category ON amortizations(category);
CREATE INDEX IF NOT EXISTS idx_amortizations_status ON amortizations(status);

-- Politiques RLS
CREATE POLICY "Users can read own amortizations"
  ON amortizations
  FOR SELECT
  TO authenticated
  USING ((uid())::text = user_id);

CREATE POLICY "Users can insert own amortizations"
  ON amortizations
  FOR INSERT
  TO authenticated
  WITH CHECK ((uid())::text = user_id);

CREATE POLICY "Users can update own amortizations"
  ON amortizations
  FOR UPDATE
  TO authenticated
  USING ((uid())::text = user_id);

CREATE POLICY "Users can delete own amortizations"
  ON amortizations
  FOR DELETE
  TO authenticated
  USING ((uid())::text = user_id);