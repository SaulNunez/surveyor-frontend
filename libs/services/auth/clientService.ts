import { ClientModel } from "../../models/auth/clientSchema";
import { ClientInputDao } from "../../models/auth/dao/clientCreationModel";
const crypto = require('crypto');

export async function createClient(clientDao: ClientInputDao, userId: string) {
    const clientId = generateRandomString(16);
    const clientSecret = generateSecureRandomString(32);
    
    const client = new ClientModel({
        clientName: clientDao.clientName,
        clientDescription: clientDao.clientDescription,
        _id: clientId,
        clientSecret,
        redirectUris: clientDao.redirectUris ?? [],
        user: userId
    });
    await client.save();

    return {
        clientName: client.clientName,
        clientDescription: client.clientDescription,
        redirectUris: client.redirectUris,
        clientId: client._id,
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