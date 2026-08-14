import { db } from './src/db';

async function migrate() {
  const client = await db.connect();
  try {
    console.log('Starting migration: Add booking_name to bookings...');

    // Step 1: Add the column (nullable first)
    await client.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS booking_name VARCHAR(255)
    `);
    console.log('✓ Column booking_name added (nullable).');

    // Step 2: Backfill existing rows with the linked event's name
    const result = await client.query(`
      UPDATE bookings b
      SET booking_name = e.name
      FROM events e
      WHERE b.event_id = e.id
        AND b.booking_name IS NULL
    `);
    console.log(`✓ Backfilled ${result.rowCount} rows with their event name.`);

    // Step 3: For any orphan bookings without an event link, use a fallback
    const orphanResult = await client.query(`
      UPDATE bookings
      SET booking_name = 'Untitled Booking'
      WHERE booking_name IS NULL
    `);
    if ((orphanResult.rowCount ?? 0) > 0) {
      console.log(`✓ Set fallback name for ${orphanResult.rowCount} orphan bookings.`);
    }

    // Step 4: Add NOT NULL constraint
    await client.query(`
      ALTER TABLE bookings
      ALTER COLUMN booking_name SET NOT NULL
    `);
    console.log('✓ NOT NULL constraint applied to booking_name.');

    // Step 5: Set default for future inserts (safety net)
    await client.query(`
      ALTER TABLE bookings
      ALTER COLUMN booking_name SET DEFAULT ''
    `);
    console.log('✓ Default set for booking_name.');

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

migrate();
