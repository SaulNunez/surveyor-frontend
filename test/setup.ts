import { beforeEach } from 'vitest';
import { db } from '../libs/db';
import { sql } from 'drizzle-orm';

// Clean up all data before each test to guarantee isolation
beforeEach(async () => {
  try {
    await db.execute(sql`
      TRUNCATE TABLE responses, attempts, questions, surveys, refresh_tokens, clients, users RESTART IDENTITY CASCADE;
    `);
  } catch (error) {
    console.error('Failed to clean up test database:', error);
    throw error;
  }
});
