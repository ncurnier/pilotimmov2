-- Ajout de la catégorie "Immeuble hors terrain" pour les amortissements
-- Met à jour la contrainte CHECK afin d'autoriser la nouvelle catégorie utilisée par le frontend

ALTER TABLE public.amortizations
DROP CONSTRAINT IF EXISTS amortizations_category_check;

ALTER TABLE public.amortizations
ADD CONSTRAINT amortizations_category_check
CHECK (category IN (
  'mobilier',
  'electromenager',
  'informatique',
  'travaux',
  'amenagement',
  'immeuble_hors_terrain',
  'autre'
));
