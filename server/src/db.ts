import path from 'path';
import dotenv from 'dotenv';
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
  ssl: databaseUrl?.includes('localhost') ? false : true,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000 to prevent Neon cold-start timeouts
});
