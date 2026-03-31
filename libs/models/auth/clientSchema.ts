import { ObjectId } from "mongodb";

export interface Client {
    clientName: string,
    clientDescription: string,
    clientSecret: string,
    redirectUris: string[],
    //grants!: string[];
    user: ObjectId
}