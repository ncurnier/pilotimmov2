/*
  # Configuration du contexte de bien global - Liaison automatique property_id

  1. Vérification et ajout des colonnes property_id manquantes
  2. Contraintes FK avec cascade delete
  3. Index pour les performances
  4. Policies RLS basées sur l'appartenance du bien à l'utilisateur
  
  Tables concernées:
  - properties (table de référence)
  - revenues (déjà property_id)
  - expenses (déjà property_id) 
  - tenants (déjà property_id)
  - amortizations (déjà property_id)
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Vérification que la table properties existe et a les bonnes colonnes
DO $$
BEGIN
  -- Vérifier que user_id existe sur properties (équivalent à owner_id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'Table properties doit avoir une colonne user_id';
  END IF;
END $$;

-- 1. REVENUES - Vérification et mise à jour des contraintes
DO $$
BEGIN
  -- Vérifier que property_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'revenues' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE revenues ADD COLUMN property_id uuid;
  END IF;
  
  -- Backfill si nécessaire (les données existantes devraient déjà avoir property_id)
  -- Si des lignes n'ont pas de property_id, on ne peut pas les backfiller automatiquement
  -- Ces lignes devront être traitées manuellement
  
  -- Vérifier s'il y a des lignes sans property_id
  IF EXISTS (SELECT 1 FROM revenues WHERE property_id IS NULL) THEN
    RAISE NOTICE 'ATTENTION: Des revenus sans property_id détectés. Traitement manuel requis.';
  END IF;
  
  -- Contrainte NOT NULL (seulement si toutes les lignes ont property_id)
  IF NOT EXISTS (SELECT 1 FROM revenues WHERE property_id IS NULL) THEN
    ALTER TABLE revenues ALTER COLUMN property_id SET NOT NULL;
  END IF;
  
  -- Contrainte FK avec cascade delete
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'revenues_property_fk'
  ) THEN
    ALTER TABLE revenues 
    ADD CONSTRAINT revenues_property_fk 
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. EXPENSES - Vérification et mise à jour des contraintes
DO $$
BEGIN
  -- Vérifier que property_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN property_id uuid;
  END IF;
  
  -- Vérifier s'il y a des lignes sans property_id
  IF EXISTS (SELECT 1 FROM expenses WHERE property_id IS NULL) THEN
    RAISE NOTICE 'ATTENTION: Des dépenses sans property_id détectées. Traitement manuel requis.';
  END IF;
  
  -- Contrainte NOT NULL (seulement si toutes les lignes ont property_id)
  IF NOT EXISTS (SELECT 1 FROM expenses WHERE property_id IS NULL) THEN
    ALTER TABLE expenses ALTER COLUMN property_id SET NOT NULL;
  END IF;
  
  -- Contrainte FK avec cascade delete
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'expenses_property_fk'
  ) THEN
    ALTER TABLE expenses 
    ADD CONSTRAINT expenses_property_fk 
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. TENANTS - Vérification et mise à jour des contraintes
DO $$
BEGIN
  -- Vérifier que property_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN property_id uuid;
  END IF;
  
  -- Vérifier s'il y a des lignes sans property_id
  IF EXISTS (SELECT 1 FROM tenants WHERE property_id IS NULL) THEN
    RAISE NOTICE 'ATTENTION: Des locataires sans property_id détectés. Traitement manuel requis.';
  END IF;
  
  -- Contrainte NOT NULL (seulement si toutes les lignes ont property_id)
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE property_id IS NULL) THEN
    ALTER TABLE tenants ALTER COLUMN property_id SET NOT NULL;
  END IF;
  
  -- Contrainte FK avec cascade delete
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenants_property_fk'
  ) THEN
    ALTER TABLE tenants 
    ADD CONSTRAINT tenants_property_fk 
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. AMORTIZATIONS - Vérification et mise à jour des contraintes
DO $$
BEGIN
  -- Vérifier que property_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'amortizations' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE amortizations ADD COLUMN property_id uuid;
  END IF;
  
  -- Vérifier s'il y a des lignes sans property_id
  IF EXISTS (SELECT 1 FROM amortizations WHERE property_id IS NULL) THEN
    RAISE NOTICE 'ATTENTION: Des amortissements sans property_id détectés. Traitement manuel requis.';
  END IF;
  
  -- Contrainte NOT NULL (seulement si toutes les lignes ont property_id)
  IF NOT EXISTS (SELECT 1 FROM amortizations WHERE property_id IS NULL) THEN
    ALTER TABLE amortizations ALTER COLUMN property_id SET NOT NULL;
  END IF;
  
  -- Contrainte FK avec cascade delete
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'amortizations_property_fk'
  ) THEN
    ALTER TABLE amortizations 
    ADD CONSTRAINT amortizations_property_fk 
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. INDEX pour les performances
CREATE INDEX IF NOT EXISTS idx_revenues_property_id ON revenues(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_property_id ON amortizations(property_id);

-- 6. RLS POLICIES basées sur l'appartenance du bien à l'utilisateur

-- REVENUES
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenues_select_own_property" ON revenues;
CREATE POLICY "revenues_select_own_property" ON revenues
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = revenues.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "revenues_insert_own_property" ON revenues;
CREATE POLICY "revenues_insert_own_property" ON revenues
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = revenues.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "revenues_update_own_property" ON revenues;
CREATE POLICY "revenues_update_own_property" ON revenues
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = revenues.property_id
      AND p.user_id = auth.uid()::text
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = revenues.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "revenues_delete_own_property" ON revenues;
CREATE POLICY "revenues_delete_own_property" ON revenues
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = revenues.property_id
      AND p.user_id = auth.uid()::text
  )
);

-- EXPENSES
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select_own_property" ON expenses;
CREATE POLICY "expenses_select_own_property" ON expenses
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "expenses_insert_own_property" ON expenses;
CREATE POLICY "expenses_insert_own_property" ON expenses
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "expenses_update_own_property" ON expenses;
CREATE POLICY "expenses_update_own_property" ON expenses
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()::text
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "expenses_delete_own_property" ON expenses;
CREATE POLICY "expenses_delete_own_property" ON expenses
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = expenses.property_id
      AND p.user_id = auth.uid()::text
  )
);

-- TENANTS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_own_property" ON tenants;
CREATE POLICY "tenants_select_own_property" ON tenants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = tenants.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "tenants_insert_own_property" ON tenants;
CREATE POLICY "tenants_insert_own_property" ON tenants
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = tenants.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "tenants_update_own_property" ON tenants;
CREATE POLICY "tenants_update_own_property" ON tenants
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = tenants.property_id
      AND p.user_id = auth.uid()::text
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = tenants.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "tenants_delete_own_property" ON tenants;
CREATE POLICY "tenants_delete_own_property" ON tenants
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = tenants.property_id
      AND p.user_id = auth.uid()::text
  )
);

-- AMORTIZATIONS
ALTER TABLE amortizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amortizations_select_own_property" ON amortizations;
CREATE POLICY "amortizations_select_own_property" ON amortizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "amortizations_insert_own_property" ON amortizations;
CREATE POLICY "amortizations_insert_own_property" ON amortizations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "amortizations_update_own_property" ON amortizations;
CREATE POLICY "amortizations_update_own_property" ON amortizations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "amortizations_delete_own_property" ON amortizations;
CREATE POLICY "amortizations_delete_own_property" ON amortizations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = amortizations.property_id
      AND p.user_id = auth.uid()::text
  )
);

-- Supprimer les anciennes policies basées sur user_id direct
DROP POLICY IF EXISTS "Users can read own revenues" ON revenues;
DROP POLICY IF EXISTS "Users can insert own revenues" ON revenues;
DROP POLICY IF EXISTS "Users can update own revenues" ON revenues;
DROP POLICY IF EXISTS "Users can delete own revenues" ON revenues;

DROP POLICY IF EXISTS "Users can read own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
DROP POLICY IF EXISTS "tenants_insert_own" ON tenants;
DROP POLICY IF EXISTS "tenants_update_own" ON tenants;
DROP POLICY IF EXISTS "tenants_delete_own" ON tenants;

DROP POLICY IF EXISTS "amortizations_select_own" ON amortizations;
DROP POLICY IF EXISTS "amortizations_insert_own" ON amortizations;
DROP POLICY IF EXISTS "amortizations_update_own" ON amortizations;
DROP POLICY IF EXISTS "amortizations_delete_own" ON amortizations;

-- Log de fin
DO $$
BEGIN
  RAISE NOTICE 'Migration property_context_setup terminée avec succès';
  RAISE NOTICE 'Vérifiez les logs pour d''éventuelles données sans property_id';
END $$;