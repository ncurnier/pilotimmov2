/*
  # Ajout de la table des locataires

  1. Nouvelle table
    - `tenants`
      - `id` (uuid, primary key)
      - `user_id` (text, foreign key vers users)
      - `property_id` (uuid, foreign key vers properties)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, optionnel)
      - `phone` (text, optionnel)
      - `start_date` (date)
      - `end_date` (date, optionnel)
      - `monthly_rent` (numeric)
      - `deposit` (numeric)
      - `status` (text: 'active', 'inactive', 'ended')
      - `notes` (text, optionnel)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur `tenants`
    - Politiques pour les utilisateurs authentifiés
*/

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date DEFAULT NULL,
  monthly_rent numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Politiques RLS
CREATE POLICY "Users can read own tenants"
  ON tenants
  FOR SELECT
  TO authenticated
  USING ((uid())::text = user_id);

CREATE POLICY "Users can insert own tenants"
  ON tenants
  FOR INSERT
  TO authenticated
  WITH CHECK ((uid())::text = user_id);

CREATE POLICY "Users can update own tenants"
  ON tenants
  FOR UPDATE
  TO authenticated
  USING ((uid())::text = user_id);

CREATE POLICY "Users can delete own tenants"
  ON tenants
  FOR DELETE
  TO authenticated
  USING ((uid())::text = user_id);