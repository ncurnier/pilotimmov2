/*
  # Create revenues table

  1. New Tables
    - `revenues`
      - `id` (uuid, primary key)
      - `user_id` (text) - references users.uid
      - `property_id` (uuid) - references properties.id
      - `amount` (numeric)
      - `date` (date)
      - `type` (text) - rent, deposit, charges, etc.
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `revenues` table
    - Add policies for authenticated users to manage their own revenues
*/

CREATE TABLE IF NOT EXISTS revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  property_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  type text DEFAULT 'rent' CHECK (type IN ('rent', 'deposit', 'charges', 'other')),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own revenues"
  ON revenues
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own revenues"
  ON revenues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own revenues"
  ON revenues
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own revenues"
  ON revenues
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);