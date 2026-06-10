import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = (process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/surveyor').replace(/^"|"$/g, '');
const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
export type DbType = typeof db;
