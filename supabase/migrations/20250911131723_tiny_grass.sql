/*
  # Create declarations table

  1. New Tables
    - `declarations`
      - `id` (uuid, primary key)
      - `user_id` (text) - references users.uid
      - `year` (integer) - tax year
      - `status` (text) - draft, in_progress, completed, submitted
      - `total_revenue` (numeric)
      - `total_expenses` (numeric)
      - `net_result` (numeric)
      - `data` (jsonb) - declaration form data
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `declarations` table
    - Add policies for authenticated users to manage their own declarations
*/

CREATE TABLE IF NOT EXISTS declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  year integer NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'submitted')),
  total_revenue numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  net_result numeric DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own declarations"
  ON declarations
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own declarations"
  ON declarations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own declarations"
  ON declarations
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own declarations"
  ON declarations
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);