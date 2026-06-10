import { db } from "../../db";
import { refreshTokens } from "../../db/schema";
import bcrypt from "bcrypt";

export async function saveRefreshToken(token: string, userId: string, clientId: string, expiryDate: Date) {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedToken = await bcrypt.hash(token, salt);

        await db.insert(refreshTokens).values({
            token: hashedToken,
            userId,
            clientId,
            expiryDate
        });
        return true;
    } catch (err) {
        return false;
    }
}