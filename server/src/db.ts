import dotenv from 'dotenv';
import path from 'path';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import type { Pool as PgPool, PoolClient } from 'pg';
import ws from 'ws';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure Neon to use WebSockets over port 443 for firewall immunity
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;

const databaseUrlRaw = process.env.DATABASE_URL;

if (!databaseUrlRaw) {
  console.error('DATABASE_URL is missing from server/.env');
}

const databaseUrl = databaseUrlRaw?.replace(/([?&])sslmode=[^&]*&?/g, '$1').replace(/[?&]$/, '') || '';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from server/.env');
}

export const db: PgPool = new NeonPool({
  connectionString: databaseUrl,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 30s to handle Neon cold-start wakeups
}) as unknown as PgPool;

// Re-export PoolClient for consumers
export type { PoolClient };

// Catch idle client errors so they don't crash the Node.js process
db.on('error', (err: Error) => {
  console.error('Unexpected error on idle database client', err);
});

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The original error is more useful than a rollback failure.
    }
    throw err;
  } finally {
    client.release();
  }
}


