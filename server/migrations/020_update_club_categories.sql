-- 020_update_club_categories.sql
-- Fix the categorization of clubs to correctly assign 'organisation' and 'committee' types

DO $$
BEGIN
  -- Update known Organisations
  UPDATE clubs 
  SET organization_type = 'organisation' 
  WHERE name ILIKE '%IEEE%' 
     OR name ILIKE '%Sambhav%';

  -- Update known Committees and similar administrative bodies
  UPDATE clubs 
  SET organization_type = 'committee' 
  WHERE name ILIKE '%Committee%' 
     OR name ILIKE '%Commission%' 
     OR name ILIKE '%Placement Cell%';

END $$;
