import { createTokenForUser } from "@/libs/repositories/auth/tokenRepository";
const bcrypt = require('bcryptjs');

export async function saveRefreshToken(token: string, userId: string, clientId: string, expiryDate: Date) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(token, salt);

    const result = await createTokenForUser({
        token_hash: hash,
        userId,
        clientId,
        expiryDate
    });

    return result.toString();
}