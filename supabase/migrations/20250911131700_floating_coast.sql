/*
  # Create users table

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `uid` (text, unique) - Firebase Auth UID
      - `email` (text, unique)
      - `display_name` (text)
      - `first_name` (text)
      - `last_name` (text)
      - `subscription` (text) - free, premium, pro
      - `preferences` (jsonb) - user preferences
      - `stats` (jsonb) - user statistics
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read/write their own data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  display_name text DEFAULT '',
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  subscription text DEFAULT 'free' CHECK (subscription IN ('free', 'premium', 'pro')),
  preferences jsonb DEFAULT '{
    "notifications": true,
    "newsletter": true,
    "two_factor_auth": false,
    "theme": "light"
  }'::jsonb,
  stats jsonb DEFAULT '{
    "properties_count": 0,
    "total_revenue": 0,
    "total_expenses": 0,
    "declarations_count": 0
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = uid);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = uid);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = uid);