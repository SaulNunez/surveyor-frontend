// Postgres' unique_violation.
const UNIQUE_VIOLATION = '23505';

/**
 * Whether this is a unique violation against a particular constraint.
 *
 * The driver's error is not the one drizzle throws: drizzle wraps it in a
 * `DrizzleQueryError` carrying the query and params, and the `code` and
 * `constraint` fields live on the `cause` underneath. The chain is walked
 * rather than reached into by one level, so a future wrapper cannot silently
 * turn every collision back into an unhandled 500.
 *
 * `constraintFragment` is matched as a substring because the same constraint
 * is named differently depending on how it was created — drizzle's migrations
 * produce `users_email_unique`, an inline `UNIQUE` produces `users_email_key`.
 */
export function isUniqueViolation(error: unknown, constraintFragment: string): boolean {
    let current: unknown = error;

    while (typeof current === 'object' && current !== null) {
        const candidate = current as { code?: string; constraint?: string; cause?: unknown };

        if (candidate.code === UNIQUE_VIOLATION
            && String(candidate.constraint ?? '').includes(constraintFragment)) {
            return true;
        }

        current = candidate.cause;
    }

    return false;
}
