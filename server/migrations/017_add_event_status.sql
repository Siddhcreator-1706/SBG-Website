-- 017_add_event_status.sql
-- Add status column to events table to support independent event registration approvals

ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Optional: You could add a check constraint if desired
-- ALTER TABLE events ADD CONSTRAINT check_event_status CHECK (status IN ('active', 'pending', 'rejected'));
