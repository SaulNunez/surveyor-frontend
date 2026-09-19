// Runs once per server process before any request is served.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./libs/db/migrate');
    await runMigrations();
  }
}
