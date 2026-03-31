import { ObjectId } from "mongodb";
import { Client } from "../../models/auth/clientSchema";
import { ClientInputDao } from "../../models/auth/dao/clientCreationModel";
import bcrypt from "bcrypt";
import { addNewClient } from "@/libs/repositories/auth/clientRepository";
const crypto = require('crypto');

export async function createClient(clientDao: ClientInputDao, userId: string) {
    const clientSecret = generateSecureRandomString(32);
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(clientSecret, salt);

    const client: Client = {
        clientName: clientDao.clientName,
        clientDescription: clientDao.clientDescription,
        clientSecret: hash,
        redirectUris: clientDao.redirectUris ?? [],
        user: new ObjectId(userId)
    };

    const clientId = await addNewClient(client);

    return {
        clientName: client.clientName,
        clientDescription: client.clientDescription,
        redirectUris: client.redirectUris,
        clientId: clientId,
        clientSecret
    };
}

export async function getClientById(clientId: string) {
    try {
        const clientInfo = await ClientModel.findById(clientId).exec();
        return clientInfo;
    } catch (err) {
        throw err;
    }
}
    

function generateRandomString(lenght : number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for ( let i = 0; i < lenght; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function generateSecureRandomString(byteLenght: number) {
    return crypto.randomBytes(byteLenght).toString('hex');
}