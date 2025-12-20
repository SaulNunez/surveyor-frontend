import { ObjectId } from "mongodb";
import { Question } from "../models/questionSchema";
import { Response } from "../models/responseSchema";
import { surveyorDb } from "./database";

const ATTEMPTS_COLLECTION = 'attempts';

export async function deleteResponse(responseId: string, attemptId: string) {
    const query = {
        _id: new ObjectId(attemptId),
        questions: { $elemMatch: { _id: responseId } }
    };
    const result = await surveyorDb.collection(ATTEMPTS_COLLECTION).deleteOne(query);
    return result.deletedCount === 1;
}

export async function editResponse(attemptId: string, responseId: string, questionData: Response) {
    const query = {
        _id: new ObjectId(attemptId),
        "responses._id": new ObjectId(responseId)
    };
    const result = await surveyorDb.collection(ATTEMPTS_COLLECTION).updateOne(query, questionData);
    return result.modifiedCount === 1;
}

export async function createResponse(attemptId: string, questionData: Question) {
    const query = {
        _id: new ObjectId(attemptId)
    }
    const data = {
        $push: {
            questions: questionData
        } 
    };
    const result = await surveyorDb.collection(ATTEMPTS_COLLECTION).updateOne(query, data);
}

export async function getResponseById(responseId: string, attemptId: string) {
    const query = {
        _id: new ObjectId(attemptId),
        "responses._id": new ObjectId(responseId)
    };
    const attempt = await surveyorDb.collection(ATTEMPTS_COLLECTION).findOne(query);
    return attempt;
}