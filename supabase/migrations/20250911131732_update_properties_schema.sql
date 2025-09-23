/*
  # Update properties table to match application schema

  1. Changes
    - rename column `rental_value` to `monthly_rent`
    - add columns `start_date` and `description`
    - drop unused columns
    - update `type` and `status` constraints
*/

ALTER TABLE properties
  RENAME COLUMN rental_value TO monthly_rent;

ALTER TABLE properties
  ADD COLUMN start_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN description text;

ALTER TABLE properties
  DROP COLUMN name,
  DROP COLUMN surface,
  DROP COLUMN rooms,
  DROP COLUMN purchase_price,
  DROP COLUMN purchase_date;

ALTER TABLE properties
  ALTER COLUMN monthly_rent SET NOT NULL,
  ALTER COLUMN monthly_rent SET DEFAULT 0,
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_type_check,
  ADD CONSTRAINT properties_type_check CHECK (type IN ('apartment', 'house', 'studio', 'other'));

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_status_check,
  ADD CONSTRAINT properties_status_check CHECK (status IN ('active', 'inactive'));

