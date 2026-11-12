import { beforeEach, inject } from 'vitest';
import { sql } from 'drizzle-orm';

// Must happen before the first import of libs/db in this worker: it reads
// DATABASE_URL when the module is evaluated. Hence the dynamic import.
process.env.DATABASE_URL = inject('databaseUrl');
const { db } = await import('../libs/db');

// Clean up all data before each test to guarantee isolation
beforeEach(async () => {
  try {
    await db.execute(sql`
      TRUNCATE TABLE question_summaries, responses, attempts, questions, surveys, refresh_tokens, clients, users RESTART IDENTITY CASCADE;
    `);
  } catch (error) {
    console.error('Failed to clean up test database:', error);
    throw error;
  }
});
