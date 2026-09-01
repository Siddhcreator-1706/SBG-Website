-- 014_optimize_indexes.sql
-- Archives Optimization
-- Needed for the archives page to quickly load historical data per club
CREATE INDEX IF NOT EXISTS idx_archived_bookings_club ON archived_bookings (club_id);
CREATE INDEX IF NOT EXISTS idx_archived_events_club ON archived_events (club_id);
CREATE INDEX IF NOT EXISTS idx_archived_reports_club ON archived_event_reports (club_id);
