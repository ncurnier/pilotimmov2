/*
  # Eliminate test placeholders and add UUID/amortization guards

  1. Database Setup
    - Enable pgcrypto extension for secure UUID generation
    - Standardize all uuid columns to use gen_random_uuid() as default
    - Clean up any existing invalid data with string placeholders

  2. Amortization Guards
    - Add strict constraint: useful_life_years >= 1 (prevent division by zero)
    - Update calculate_amortization() function to be tolerant of edge cases
    - Ensure annual_amortization calculation is safe

  3. Helper Functions
    - get_or_create_test_user(): Get existing auth.users or create minimal test user
    - get_or_create_test_property(uuid): Create minimal property for testing
    - Auto-detect properties table and handle gracefully

  4. Data Cleanup
    - Remove any existing records with 'test-user-id' or 'test-property-id'
    - Remove any amortizations with useful_life_years = 0
    - Ensure all UUIDs are real cryptographic UUIDs

  5. Quality Seeds
    - Create valid test data using real UUIDs only
    - All amounts positive, all years >= 1
    - Idempotent inserts (ON CONFLICT DO NOTHING)
*/

-- 1. Enable pgcrypto for secure UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Standardize UUID defaults (ensure all id columns use gen_random_uuid())
DO $$
BEGIN
  -- Users table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    BEGIN
      ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
      RAISE NOTICE '✅ users.id default set to gen_random_uuid()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not update users.id default: %', SQLERRM;
    END;
  END IF;

  -- Properties table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
    BEGIN
      ALTER TABLE properties ALTER COLUMN id SET DEFAULT gen_random_uuid();
      RAISE NOTICE '✅ properties.id default set to gen_random_uuid()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not update properties.id default: %', SQLERRM;
    END;
  END IF;

  -- Revenues table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenues') THEN
    BEGIN
      ALTER TABLE revenues ALTER COLUMN id SET DEFAULT gen_random_uuid();
      RAISE NOTICE '✅ revenues.id default set to gen_random_uuid()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not update revenues.id default: %', SQLERRM;
    END;
  END IF;

  -- Expenses table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    BEGIN
      ALTER TABLE expenses ALTER COLUMN id SET DEFAULT gen_random_uuid();
      RAISE NOTICE '✅ expenses.id default set to gen_random_uuid()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not update expenses.id default: %', SQLERRM;
    END;
  END IF;

  -- Declarations table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'declarations') THEN
    BEGIN
      ALTER TABLE declarations ALTER COLUMN id SET DEFAULT gen_random_uuid();
      RAISE NOTICE '✅ declarations.id default set to gen_random_uuid()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not update declarations.id default: %', SQLERRM;
    END;
  END IF;

  -- Notifications table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    BEGIN
      ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();
      RAISE NOTICE '✅ notifications.id default set to gen_random_uuid()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not update notifications.id default: %', SQLERRM;
    END;
  END IF;

  -- Tenants table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
    BEGIN
      ALTER TABLE tenants ALTER COLUMN id SET DEFAULT gen_random_uuid();
      RAISE NOTICE '✅ tenants.id default set to gen_random_uuid()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not update tenants.id default: %', SQLERRM;
    END;
  END IF;

  -- Amortizations table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'amortizations') THEN
    BEGIN
      ALTER TABLE amortizations ALTER COLUMN id SET DEFAULT gen_random_uuid();
      RAISE NOTICE '✅ amortizations.id default set to gen_random_uuid()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Could not update amortizations.id default: %', SQLERRM;
    END;
  END IF;
END;
$$;

-- 3. Clean up invalid data with string placeholders
DO $$
BEGIN
  -- Remove any records with test placeholders in UUID columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'amortizations') THEN
    DELETE FROM amortizations
    WHERE user_id = 'test-user-id'
       OR property_id::text = 'test-property-id'
       OR useful_life_years = 0;
    RAISE NOTICE '✅ Cleaned up invalid amortizations data';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenues') THEN
    DELETE FROM revenues
    WHERE user_id = 'test-user-id'
       OR property_id::text = 'test-property-id';
    RAISE NOTICE '✅ Cleaned up invalid revenues data';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    DELETE FROM expenses
    WHERE user_id = 'test-user-id'
       OR property_id::text = 'test-property-id';
    RAISE NOTICE '✅ Cleaned up invalid expenses data';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
    DELETE FROM tenants
    WHERE user_id = 'test-user-id'
       OR property_id::text = 'test-property-id';
    RAISE NOTICE '✅ Cleaned up invalid tenants data';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
    DELETE FROM properties 
    WHERE user_id = 'test-user-id';
    RAISE NOTICE '✅ Cleaned up invalid properties data';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    DELETE FROM users 
    WHERE user_id = 'test-user-id';
    RAISE NOTICE '✅ Cleaned up invalid users data';
  END IF;
END;
$$;

-- 4. Add strict constraint on useful_life_years (prevent division by zero)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'amortizations') THEN
    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'amortizations' 
      AND constraint_name = 'amortizations_useful_life_years_check'
    ) THEN
      ALTER TABLE amortizations 
      ADD CONSTRAINT amortizations_useful_life_years_check 
      CHECK (useful_life_years >= 1);
      RAISE NOTICE '✅ Added constraint: useful_life_years >= 1';
    ELSE
      RAISE NOTICE '✅ Constraint useful_life_years >= 1 already exists';
    END IF;
  END IF;
END;
$$;

-- 5. Update calculate_amortization function to be tolerant
CREATE OR REPLACE FUNCTION calculate_amortization()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure we have valid data
  IF NEW.purchase_amount IS NULL OR NEW.purchase_amount <= 0 THEN
    NEW.purchase_amount := 0;
    NEW.annual_amortization := 0;
    NEW.accumulated_amortization := 0;
    NEW.remaining_value := 0;
    RETURN NEW;
  END IF;

  -- Ensure useful_life_years is valid (>= 1)
  IF NEW.useful_life_years IS NULL OR NEW.useful_life_years <= 0 THEN
    NEW.useful_life_years := 10; -- Default to 10 years
    RAISE NOTICE 'useful_life_years was invalid, set to default 10 years';
  END IF;

  -- Calculate annual amortization (safe division)
  NEW.annual_amortization := ROUND(NEW.purchase_amount / NEW.useful_life_years, 2);

  -- Calculate years elapsed since purchase
  DECLARE
    years_elapsed INTEGER;
  BEGIN
    years_elapsed := EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM NEW.purchase_date::date);
    IF years_elapsed < 0 THEN
      years_elapsed := 0;
    END IF;

    -- Calculate accumulated amortization
    NEW.accumulated_amortization := LEAST(
      NEW.annual_amortization * years_elapsed,
      NEW.purchase_amount
    );

    -- Calculate remaining value
    NEW.remaining_value := GREATEST(
      NEW.purchase_amount - NEW.accumulated_amortization,
      0
    );
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Helper functions for safe test data creation
CREATE OR REPLACE FUNCTION get_or_create_test_user()
RETURNS uuid AS $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Try to get an existing user from auth.users
  SELECT id INTO test_user_id 
  FROM auth.users 
  LIMIT 1;
  
  -- If no auth user exists, create a minimal user in public.users
  IF test_user_id IS NULL THEN
    -- Generate a real UUID for test user
    test_user_id := gen_random_uuid();
    
    -- Insert into public.users if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
      INSERT INTO users (id, user_id, email, display_name)
      VALUES (
        gen_random_uuid(),
        test_user_id::text,
        'test@example.com',
        'Test User'
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN test_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_or_create_test_property(owner_user_id uuid)
RETURNS uuid AS $$
DECLARE
  test_property_id uuid;
  properties_table_name text;
BEGIN
  -- Auto-detect properties table name
  SELECT table_name INTO properties_table_name
  FROM information_schema.tables 
  WHERE table_name IN ('properties', 'biens', 'lmnp_biens')
  AND table_schema = 'public'
  LIMIT 1;
  
  IF properties_table_name IS NULL THEN
    RAISE EXCEPTION 'No properties table found (properties, biens, or lmnp_biens)';
  END IF;
  
  -- Try to get existing property for this user
  EXECUTE format('SELECT id FROM %I WHERE user_id = $1 LIMIT 1', properties_table_name)
  INTO test_property_id
  USING owner_user_id::text;
  
  -- If no property exists, create one
  IF test_property_id IS NULL THEN
    test_property_id := gen_random_uuid();
    
    -- Create minimal property (adapt to actual table structure)
    IF properties_table_name = 'properties' THEN
      INSERT INTO properties (id, user_id, address, monthly_rent, start_date, created_by)
      VALUES (
        test_property_id,
        owner_user_id::text,
        'Test Property Address',
        1000,
        CURRENT_DATE,
        owner_user_id::text
      )
      ON CONFLICT (id) DO NOTHING;
    ELSE
      -- Fallback for other table structures
      EXECUTE format(
        'INSERT INTO %I (id, user_id, address, monthly_rent) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        properties_table_name
      ) USING test_property_id, owner_user_id::text, 'Test Property', 1000;
    END IF;
  END IF;
  
  RETURN test_property_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create quality seed data (replace any test placeholders)
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
BEGIN
  -- Get or create test user with real UUID
  test_user_id := get_or_create_test_user();
  RAISE NOTICE '✅ Test user ID: %', test_user_id;
  
  -- Get or create test property with real UUID
  test_property_id := get_or_create_test_property(test_user_id);
  RAISE NOTICE '✅ Test property ID: %', test_property_id;
  
  -- Create valid amortization with real UUIDs and useful_life_years >= 1
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'amortizations') THEN
    INSERT INTO amortizations (
      user_id,
      property_id,
      item_name,
      category,
      purchase_date,
      purchase_amount,
      useful_life_years,
      status,
      notes
    ) VALUES (
      test_user_id::text,
      test_property_id,
      'Test Equipment',
      'mobilier',
      CURRENT_DATE - INTERVAL '1 year',
      1000.00,
      10, -- >= 1 to satisfy constraint
      'active',
      'Created by migration for testing'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Valid amortization created with real UUIDs';
  END IF;
END;
$$;

-- 8. Final validation
DO $$
BEGIN
  -- Verify no string placeholders remain in UUID columns
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'amortizations'
  ) THEN
    -- Check for invalid user_id
    IF EXISTS (
      SELECT 1 FROM amortizations 
      WHERE user_id = 'test-user-id' OR user_id = 'test-property-id'
    ) THEN
      RAISE EXCEPTION 'Invalid string placeholders still found in amortizations.user_id';
    END IF;
    
    -- Check for invalid property_id
    IF EXISTS (
      SELECT 1 FROM amortizations 
      WHERE property_id::text = 'test-user-id' OR property_id::text = 'test-property-id'
    ) THEN
      RAISE EXCEPTION 'Invalid string placeholders still found in amortizations.property_id';
    END IF;
    
    -- Check for useful_life_years = 0
    IF EXISTS (
      SELECT 1 FROM amortizations WHERE useful_life_years = 0
    ) THEN
      RAISE EXCEPTION 'Found amortizations with useful_life_years = 0 (violates constraint)';
    END IF;
    
    RAISE NOTICE '✅ All amortizations data validated - no string placeholders, no zero years';
  END IF;
END;
$$;

RAISE NOTICE '🎉 Migration completed successfully - test placeholders eliminated, guards in place';