import { RefreshTokenModel } from "../../models/auth/tokensSchema";

export async function saveRefreshToken(token: string, userId: string, clientId: string, expiryDate: Date) {
    try {
        const refreshToken = new RefreshTokenModel({
            token,
            userId,
            clientId,
            expiryDate
            });
        await refreshToken.save();
        return true;
    } catch (err) {
        return false;
    }

}