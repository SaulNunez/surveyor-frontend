// The connection string for the test database, published by test/globalSetup.ts
// and read back in each worker with inject().
declare module 'vitest' {
  interface ProvidedContext {
    databaseUrl: string;
  }
}

export {};
