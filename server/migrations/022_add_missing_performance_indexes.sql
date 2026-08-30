-- 022_add_missing_performance_indexes.sql

-- 1. Index on COALESCE(end_date, date) for Events
-- Heavily used in event Reports, getEvents, and cron jobs to filter and sort past/future events.
CREATE INDEX IF NOT EXISTS idx_events_coalesce_date ON events (COALESCE(end_date, date));

-- 2. Index on bookings end_time and status
-- Heavily used in public/campus bookings filtering (b.status = 'approved' AND b.end_time >= NOW())
CREATE INDEX IF NOT EXISTS idx_bookings_status_end_time ON bookings (status, end_time);

-- 3. Composite Index for bookings time overlapping (frequently used for conflict checking and busy venues)
CREATE INDEX IF NOT EXISTS idx_bookings_conflict_check ON bookings (venue_id, start_time, end_time) WHERE status != 'rejected';

-- 4. Index on clubs name
-- Heavily used for sorting in /clubs and /clubMembers/public
CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs (name);
