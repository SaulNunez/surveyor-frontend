import type { TestProject } from 'vitest/node';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

// Matches the image docker-compose and production run against.
const POSTGRES_IMAGE = 'postgres:15';

let container: StartedPostgreSqlContainer | undefined;

/**
 * Brings up a throwaway Postgres for the whole run and applies `drizzle/` to it,
 * so tests see exactly the schema the app boots with — there is no second,
 * hand-written copy of the schema to keep in sync.
 *
 * Set TEST_DATABASE_URL to run against an already-running database instead (no
 * Docker needed). Everything in it is dropped and truncated, so it must not be a
 * database anyone cares about; plain DATABASE_URL is deliberately ignored here,
 * since it usually points at a developer's own instance.
 */
export async function setup(project: TestProject) {
  const existing = process.env.TEST_DATABASE_URL;
  let databaseUrl: string;

  if (existing) {
    console.log('Using TEST_DATABASE_URL; not starting a container.');
    databaseUrl = existing;
  } else {
    console.log(`Starting ${POSTGRES_IMAGE} container for tests…`);
    container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
    databaseUrl = container.getConnectionUri();
  }

  // libs/db builds its pool from DATABASE_URL at module-evaluation time, so this
  // has to be set before anything imports it — hence the dynamic import below.
  process.env.DATABASE_URL = databaseUrl;
  const { runMigrations } = await import('../libs/db/migrate');
  await runMigrations();

  // Workers are separate processes: hand them the URL over vitest's own channel
  // rather than relying on env inheritance.
  project.provide('databaseUrl', databaseUrl);
}

export async function teardown() {
  await container?.stop();
}
