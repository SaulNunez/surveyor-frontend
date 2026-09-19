import { UserInputDao } from "../../models/auth/dao/userCreationModel";
import { db } from "../../db";
import { Executor } from "../../db/executor";
import { users } from "../../db/schema";
import { isUniqueViolation } from "../../db/errors";
import { and, eq, isNull } from "drizzle-orm";
import { InvalidOperationError } from "../../models/Errors/invalidOperationError";
import bcrypt from "bcrypt";

type UserRow = typeof users.$inferSelect;

/**
 * The only user shape that may leave the server. Never includes the password hash.
 */
export interface PublicUser {
    id: string;
    /** Null on a guest account, which has no credentials at all. */
    email: string | null;
    displayName: string | null;
    /**
     * Derived from the row rather than stored, so it cannot drift out of step
     * with the credentials themselves. The `users_anonymous_or_credentialed`
     * check constraint is what makes reading one column enough.
     */
    isAnonymous: boolean;
}

function toPublicUser(user: UserRow): PublicUser {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAnonymous: user.password === null,
    };
}

/**
 * Someone else already holds this email. The constraint is named so an
 * unrelated unique violation is not reported as a taken email.
 */
function isEmailCollision(error: unknown) {
    return isUniqueViolation(error, 'email');
}

export async function createUser({ email, password }: UserInputDao, executor: Executor = db): Promise<PublicUser> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        const created = await executor.insert(users).values({
            email,
            password: hashedPassword
        }).returning();

        return toPublicUser(created[0]);
    } catch (error) {
        if (isEmailCollision(error)) {
            throw new InvalidOperationError('That email is already registered');
        }
        throw error;
    }
}

/**
 * Mints a guest account: a real user row with no email and no password, which
 * is identified only by its uuid and lives entirely in the visitor's session
 * cookie. Callers must decide whether minting one is allowed — see
 * `createAnonymousUserForSurvey`.
 */
export async function createAnonymousUser(executor: Executor = db): Promise<PublicUser> {
    const created = await executor.insert(users).values({
        email: null,
        password: null,
    }).returning();

    return toPublicUser(created[0]);
}

/**
 * Claims a guest account by giving it credentials, keeping the same user id so
 * every attempt and response it already recorded carries over untouched.
 *
 * The `password is null` predicate lives in the UPDATE rather than in a
 * preceding read: a session's `isAnonymous` claim can be stale, and two tabs
 * racing to claim the same guest must not both succeed. Zero rows back means
 * either no such user or one that already has credentials — the two are
 * indistinguishable here, and deliberately reported the same way.
 */
export async function linkAnonymousAccount(
    userId: string,
    email: string,
    password: string,
    executor: Executor = db
): Promise<PublicUser> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let updated;
    try {
        updated = await executor.update(users)
            .set({ email, password: hashedPassword })
            .where(and(eq(users.id, userId), isNull(users.password)))
            .returning();
    } catch (error) {
        if (isEmailCollision(error)) {
            // The update never committed, so the guest row — and the session
            // pointing at it — is left exactly as it was.
            throw new InvalidOperationError('That email is already registered');
        }
        throw error;
    }

    if (updated.length === 0) {
        throw new InvalidOperationError('This account already has credentials');
    }

    return toPublicUser(updated[0]);
}

export async function getUserByEmail(email: string, executor: Executor = db): Promise<PublicUser | undefined> {
    const results = await executor.select().from(users).where(eq(users.email, email)).limit(1);
    if (results.length === 0) return undefined;
    return toPublicUser(results[0]);
}

export async function getUserById(userId: string, executor: Executor = db): Promise<PublicUser | undefined> {
    const results = await executor.select().from(users).where(eq(users.id, userId)).limit(1);
    if (results.length === 0) return undefined;
    return toPublicUser(results[0]);
}

/**
 * Reads the password hash alongside the user. Only the credentials provider in
 * `auth.ts` should call this; everything else must use `getUserByEmail`. The
 * hash is null for a guest account, which therefore cannot be signed in to
 * with a password — the provider has to check.
 */
export async function getUserCredentialsByEmail(email: string, executor: Executor = db) {
    const results = await executor.select().from(users).where(eq(users.email, email)).limit(1);
    if (results.length === 0) return undefined;
    const user = results[0];
    return { ...toPublicUser(user), password: user.password };
}

export async function updateUserName(userId: string, displayName: string, executor: Executor = db): Promise<PublicUser | undefined> {
    const updated = await executor.update(users)
        .set({ displayName })
        .where(eq(users.id, userId))
        .returning();

    if (updated.length === 0) return undefined;
    return toPublicUser(updated[0]);
}
