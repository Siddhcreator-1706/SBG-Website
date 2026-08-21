-- 019_standalone_bookings.sql
-- Add booking_name column to support standalone club meets
-- booking_name replaces the old 'title' concept

DO $$
BEGIN
  -- Add booking_name (replaces 'title') if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'booking_name'
  ) THEN
    -- Add nullable first for safe migration
    ALTER TABLE bookings ADD COLUMN booking_name VARCHAR(255);

    -- Backfill from linked event name
    UPDATE bookings b
    SET booking_name = e.name
    FROM events e
    WHERE b.event_id = e.id
      AND b.booking_name IS NULL;

    -- Fallback for orphan bookings
    UPDATE bookings
    SET booking_name = 'Untitled Booking'
    WHERE booking_name IS NULL;

    -- Apply NOT NULL + default for future inserts
    ALTER TABLE bookings
      ALTER COLUMN booking_name SET NOT NULL,
      ALTER COLUMN booking_name SET DEFAULT '';
  END IF;

  -- Drop old 'title' column if it accidentally exists from a previous migration attempt
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'title'
  ) THEN
    ALTER TABLE bookings DROP COLUMN title;
  END IF;
END $$;

