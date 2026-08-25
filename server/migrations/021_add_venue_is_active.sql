-- 021_add_venue_is_active.sql
-- Add is_active column to venues table to allow disabling venues without breaking booking history

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'venues' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE venues ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_venues_is_active ON venues(is_active);
  END IF;
END $$;
