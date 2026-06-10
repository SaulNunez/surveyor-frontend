import { ClientInputDao } from "../../models/auth/dao/clientCreationModel";
import { db } from "../../db";
import { clients } from "../../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function createClient(clientDao: ClientInputDao, userId: string) {
    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString('hex');
    
    const salt = await bcrypt.genSalt(10);
    const hashedSecret = await bcrypt.hash(clientSecret, salt);

    await db.insert(clients).values({
        id: clientId,
        clientName: clientDao.clientName,
        clientDescription: clientDao.clientDescription,
        clientSecret: hashedSecret,
        redirectUris: clientDao.redirectUris ?? [],
        userId: userId
    });

    return {
        clientName: clientDao.clientName,
        clientDescription: clientDao.clientDescription,
        redirectUris: clientDao.redirectUris ?? [],
        clientId: clientId,
        clientSecret: clientSecret
    };
}

export async function getClientById(clientId: string) {
    try {
        const results = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
        if (results.length === 0) return null;
        const client = results[0];
        return {
            ...client,
            _id: client.id
        };
    } catch (err) {
        throw err;
    }
}