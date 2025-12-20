import { ObjectId } from "mongodb";
import { Attempt } from "../models/attemptSchema";
import { surveyorDb } from "./database";

const ATTEMPTS_COLLECTION = 'attempts';

export async function deleteAttempt(attemptId: string, userId: string) {
    const query = {
        _id: new ObjectId(attemptId),
        user: userId 
    };
    const result = await surveyorDb.collection<Attempt>(ATTEMPTS_COLLECTION).deleteOne(query);
    return result.deletedCount === 1;
}

export async function editExistingAttempt(attemptId: string, userId: string, attemptData: Attempt) {
        const query = {
        _id: new ObjectId(attemptId),
        user: userId
    };
    const result = await surveyorDb.collection<Attempt>(ATTEMPTS_COLLECTION).updateOne(query, attemptData);
    return result.modifiedCount === 1;
}

export async function createAttempt(surveyId: string, userId: string) {
    const attempt : Attempt = {
        survey: surveyId,
        user: userId,
        responses: [],
        startedAt: new Date()
    };
    surveyorDb.collection<Attempt>(ATTEMPTS_COLLECTION).insertOne(attempt);
    return attempt;
}

export async function getAttemptById(attemptId: string) {
    const query = { _id: new ObjectId(attemptId) };
    const attempt = await surveyorDb.collection<Attempt>(ATTEMPTS_COLLECTION).findOne(query);
    return attempt;
}

export async function getAttemptBySurveyAndUser(surveyId: string, userId: string) {
    const query = { survey: surveyId, user: userId };
    const attempt = await surveyorDb.collection<Attempt>(ATTEMPTS_COLLECTION).findOne(query);
    return attempt;
}