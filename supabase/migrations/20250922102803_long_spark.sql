/*
  # Création de la table tenants (locataires) LMNP

  1. Nouvelle table tenants
    - Rattachement aux propriétés
    - Gestion des baux et changements de locataires
    - Informations complètes des locataires
    
  2. Sécurité
    - RLS activé
    - Policies basées sur auth.uid()
    
  3. Triggers
    - updated_at automatique
*/

-- Extension pour génération UUID native
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table des locataires
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  property_id uuid NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  monthly_rent numeric(10,2) NOT NULL DEFAULT 0 CHECK (monthly_rent >= 0),
  deposit numeric(10,2) NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT tenants_property_id_fkey 
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT tenants_dates_check 
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_start_date ON tenants(start_date);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Activer RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
CREATE POLICY "tenants_select_own"
  ON tenants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "tenants_insert_own" ON tenants;
CREATE POLICY "tenants_insert_own"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "tenants_update_own" ON tenants;
CREATE POLICY "tenants_update_own"
  ON tenants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "tenants_delete_own" ON tenants;
CREATE POLICY "tenants_delete_own"
  ON tenants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);