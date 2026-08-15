-- 019_standalone_bookings.sql
-- Add title and booking_type columns to support standalone club meets

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'title'
  ) THEN
    ALTER TABLE bookings ADD COLUMN title VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'booking_type'
  ) THEN
    ALTER TABLE bookings ADD COLUMN booking_type VARCHAR(50) DEFAULT 'event';
  END IF;
END $$;
