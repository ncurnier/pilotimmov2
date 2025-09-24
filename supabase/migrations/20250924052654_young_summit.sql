-- Development seed for amortizations with real UUIDs only
-- This file creates valid test data without any string placeholders

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function to get or create a test user
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
        'dev-test@example.com',
        'Dev Test User'
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN test_user_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get or create a test property
CREATE OR REPLACE FUNCTION get_or_create_test_property(owner_user_id uuid)
RETURNS uuid AS $$
DECLARE
  test_property_id uuid;
BEGIN
  -- Try to get existing property for this user
  SELECT id INTO test_property_id
  FROM properties 
  WHERE user_id = owner_user_id::text 
  LIMIT 1;
  
  -- If no property exists, create one with minimal required fields
  IF test_property_id IS NULL THEN
    test_property_id := gen_random_uuid();
    
    INSERT INTO properties (id, user_id, address, monthly_rent, start_date, created_by)
    VALUES (
      test_property_id,
      owner_user_id::text,
      'Dev Test Property Address',
      1200.00,
      CURRENT_DATE - INTERVAL '6 months',
      owner_user_id::text
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN test_property_id;
END;
$$ LANGUAGE plpgsql;

-- Main seed execution
DO $$
DECLARE
  test_user_id uuid;
  test_property_id uuid;
BEGIN
  -- Get or create test user with real UUID
  test_user_id := get_or_create_test_user();
  RAISE NOTICE 'Using test user ID: %', test_user_id;
  
  -- Get or create test property with real UUID
  test_property_id := get_or_create_test_property(test_user_id);
  RAISE NOTICE 'Using test property ID: %', test_property_id;
  
  -- Create valid amortization with real UUIDs and useful_life_years >= 1
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
    'Dev Test Equipment',
    'mobilier',
    CURRENT_DATE - INTERVAL '2 years',
    2500.00,
    10, -- >= 1 to satisfy constraint
    'active',
    'Created by dev seed for testing'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Valid amortization created with real UUIDs';
  
  -- Verify no string placeholders exist
  IF EXISTS (
    SELECT 1 FROM amortizations 
    WHERE user_id = 'test-user-id' 
       OR property_id::text = 'test-property-id'
       OR useful_life_years = 0
  ) THEN
    RAISE EXCEPTION 'CRITICAL: String placeholders or zero years still found!';
  END IF;
  
  RAISE NOTICE '🎉 Seed completed successfully - all data uses real UUIDs';
END;
$$;

-- Clean up helper functions (optional)
-- DROP FUNCTION IF EXISTS get_or_create_test_user();
-- DROP FUNCTION IF EXISTS get_or_create_test_property(uuid);