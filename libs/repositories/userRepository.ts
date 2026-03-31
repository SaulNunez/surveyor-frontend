import { User } from "../models/auth/userSchema";
import { surveyorDb } from "./database";
import { v4 as uuidv4 } from 'uuid';

const USER_COLLECTION = 'users';

export async function addUserAccount(userAccountData: {email: string, hash: string}) {    
    const insertResult = await surveyorDb.collection<User>(USER_COLLECTION).insertOne({ ...userAccountData});
    return insertResult.insertedId;
}

export async function findUserByEmail(email: string) {
    const query = { email: email };
    const user = await surveyorDb.collection<User>(USER_COLLECTION).findOne(query);
    return user;
}