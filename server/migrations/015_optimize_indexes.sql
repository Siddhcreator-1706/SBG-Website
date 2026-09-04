-- 015_optimize_indexes.sql
-- Adds missing indexes to optimize common JOINs, WHERE clauses, and sorting operations.

-- 1. Bookings Optimization
-- Highly queried by Admin (status) and Clubs (club_id), heavily used in conflict checking (venue_id, start_time)
CREATE INDEX IF NOT EXISTS idx_bookings_club_id ON bookings (club_id);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_id ON bookings (venue_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings (event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON bookings (start_time, end_time);

-- 2. Events Optimization
-- Frequently sorted by date and filtered by status/club
CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);

-- 3. Notifications Optimization
-- Polled frequently to show the unread notification badge on the frontend
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
