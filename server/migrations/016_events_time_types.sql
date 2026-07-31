-- 016_events_time_types.sql
-- Change events date and end_date columns from DATE to TIMESTAMPTZ so that time information is preserved

ALTER TABLE events 
  ALTER COLUMN date TYPE TIMESTAMPTZ USING (date::timestamp AT TIME ZONE 'UTC'),
  ALTER COLUMN end_date TYPE TIMESTAMPTZ USING (end_date::timestamp AT TIME ZONE 'UTC');
