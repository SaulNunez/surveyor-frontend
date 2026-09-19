import path from 'path';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { connectionString } from './index';

// Arbitrary constant: serializes migrations across processes starting at once.
const MIGRATION_LOCK_KEY = 727_100_001;

/**
 * Applies every migration in `drizzle/` not yet recorded in
 * `drizzle.__drizzle_migrations`. A no-op when the schema is current.
 */
export async function runMigrations() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    console.log('Applying pending database migrations…');
    await migrate(drizzle(client), {
      migrationsFolder: path.join(process.cwd(), 'drizzle'),
    });
    console.log('Database schema up to date');
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => {});
    await client.end();
  }
}
