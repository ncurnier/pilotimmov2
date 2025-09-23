/*
  # Replace data column with structured fields

  1. Changes
    - Add properties (text[]) column with default empty array
    - Add documents (text[]) column with default empty array
    - Add details (jsonb) column with default empty object
    - Backfill new columns using existing data JSON
    - Drop legacy data column
*/

ALTER TABLE declarations
  ADD COLUMN IF NOT EXISTS properties text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS documents text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb NOT NULL;

UPDATE declarations
SET
  properties = COALESCE(
    (SELECT array_agg(value::text)
     FROM jsonb_array_elements_text(COALESCE(data->'properties', '[]'::jsonb)) AS value),
    '{}'::text[]
  ),
  documents = COALESCE(
    (SELECT array_agg(value::text)
     FROM jsonb_array_elements_text(COALESCE(data->'documents', '[]'::jsonb)) AS value),
    '{}'::text[]
  ),
  details = COALESCE(data->'details', '{}'::jsonb);

ALTER TABLE declarations DROP COLUMN IF EXISTS data;
