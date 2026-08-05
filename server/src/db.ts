import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../.env') });

const databaseUrlRaw = process.env.DATABASE_URL;

if (!databaseUrlRaw) {
  console.error('DATABASE_URL is missing from server/.env');
}

let databaseUrl = databaseUrlRaw || '';
try {
  if (databaseUrl.includes('://')) {
    const url = new URL(databaseUrl);
    if (url.searchParams.has('sslmode')) {
      url.searchParams.delete('sslmode');
      databaseUrl = url.toString();
    }
  }
} catch (e) {
  // Ignore URL parse errors
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from server/.env');
}

export const db = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000 to prevent Neon cold-start timeouts
});

// Catch idle client errors so they don't crash the Node.js process
// The pg Pool will automatically remove and replace the faulty client on the next query
db.on('error', (err, client) => {
  console.error('Unexpected error on idle database client', err);
});
