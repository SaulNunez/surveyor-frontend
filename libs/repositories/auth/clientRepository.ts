import { Client } from "@/libs/models/auth/clientSchema";
import { surveyorDb } from "../database";

const CLIENT_COLLECTION = 'application_clients';

export async function addNewClient(client: Client) {
    const insertResult = await surveyorDb.collection<Client>(CLIENT_COLLECTION).insertOne(client);
    return insertResult.insertedId;
}