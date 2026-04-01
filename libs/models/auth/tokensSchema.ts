import { ObjectId } from "mongodb";
export interface RefreshToken {
    token_hash: string,
    userId: ObjectId,
    expiryDate: Date,
    clientId: ObjectId
}