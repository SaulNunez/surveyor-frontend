import { RefreshToken } from "@/libs/models/auth/tokensSchema";
import { surveyorDb } from "../database";
import { ObjectId } from "mongodb";

const USER_TOKENS = 'user_tokens';

export async function createTokenForUser(refreshToken:{token_hash: string, userId: string, clientId: string, expiryDate: Date}) {
    const insertResult = await surveyorDb.collection<RefreshToken>(USER_TOKENS).insertOne({
        userId: new ObjectId(refreshToken.userId),
        clientId: new ObjectId(refreshToken.clientId),
        token_hash: refreshToken.token_hash,
        expiryDate: refreshToken.expiryDate
    });
    return insertResult.insertedId;
}