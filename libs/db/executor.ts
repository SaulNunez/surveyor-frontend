import { db } from './index';

/**
 * Anything a service can run its queries against: the connection pool, or a
 * transaction handle from `db.transaction()`. Service functions take one of
 * these so a caller can compose several of them into a single transaction.
 */
export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
