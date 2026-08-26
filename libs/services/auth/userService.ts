import { UserInputDao } from "../../models/auth/dao/userCreationModel";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

type UserRow = typeof users.$inferSelect;

/**
 * The only user shape that may leave the server. Never includes the password hash.
 */
export interface PublicUser {
    id: string;
    email: string;
    displayName: string | null;
}

function toPublicUser(user: UserRow): PublicUser {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
    };
}

export async function createUser({ email, password }: UserInputDao) {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await db.insert(users).values({
            email,
            password: hashedPassword
        });
        return true;
    } catch (err) {
        return false;
    }
}

export async function getUserByEmail(email: string): Promise<PublicUser | undefined> {
    const results = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (results.length === 0) return undefined;
    return toPublicUser(results[0]);
}

export async function getUserById(userId: string): Promise<PublicUser | undefined> {
    const results = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (results.length === 0) return undefined;
    return toPublicUser(results[0]);
}

/**
 * Reads the password hash alongside the user. Only the credentials provider in
 * `auth.ts` should call this; everything else must use `getUserByEmail`.
 */
export async function getUserCredentialsByEmail(email: string) {
    const results = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (results.length === 0) return undefined;
    const user = results[0];
    return { ...toPublicUser(user), password: user.password };
}

export async function updateUserName(userId: string, displayName: string): Promise<PublicUser | undefined> {
    const updated = await db.update(users)
        .set({ displayName })
        .where(eq(users.id, userId))
        .returning();

    if (updated.length === 0) return undefined;
    return toPublicUser(updated[0]);
}
