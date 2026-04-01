import { Client } from "@/libs/models/auth/clientSchema";
import { surveyorDb } from "../database";
import { ObjectId } from "mongodb";

const CLIENT_COLLECTION = 'application_clients';

export async function addNewClient(client: Client) {
    const insertResult = await surveyorDb.collection<Client>(CLIENT_COLLECTION).insertOne(client);
    return insertResult.insertedId;
}

export async function getClientById(clientId: string) {
    const query = { _id: new ObjectId(clientId) };
    const client = await surveyorDb.collection<Client>(CLIENT_COLLECTION).findOne(query);
    return client;
}