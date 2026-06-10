import { UserInputDao } from "../../models/auth/dao/userCreationModel";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

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

export async function getUserByEmail(email: string) {
    try {
        const results = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (results.length === 0) return undefined;
        const user = results[0];
        return {
            ...user,
            _id: user.id
        };
    } catch (err) {
        throw err;
    }
}