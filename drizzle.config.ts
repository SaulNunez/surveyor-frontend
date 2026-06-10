// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './libs/db/schema.ts',      // Path to your schema file(s)
  out: './drizzle',                  // Folder where migrations will be saved
  dialect: 'postgresql',             // Target database engine
  dbCredentials: {
    url: process.env.DATABASE_URL!,  // Your database connection string
  },
});