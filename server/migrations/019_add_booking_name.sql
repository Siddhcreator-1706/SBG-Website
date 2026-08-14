-- Migration 019: Add booking_name to bookings table

-- 1. Add booking_name column (nullable initially for safe migration)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_name VARCHAR(255);

-- 2. Backfill existing bookings with their linked event name
UPDATE bookings b
SET booking_name = e.name
FROM events e
WHERE b.event_id = e.id
  AND b.booking_name IS NULL;

-- 3. Set fallback for any orphan bookings without linked events
UPDATE bookings
SET booking_name = 'Untitled Booking'
WHERE booking_name IS NULL;

-- 4. Apply NOT NULL constraint and default value for future inserts
ALTER TABLE bookings
ALTER COLUMN booking_name SET NOT NULL,
ALTER COLUMN booking_name SET DEFAULT '';
