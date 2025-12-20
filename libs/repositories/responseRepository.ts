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
    const result = await surveyorDb.collection<Response>(ATTEMPTS_COLLECTION).deleteOne(query);
    return result.deletedCount === 1;
}

export async function editResponse(attemptId: string, responseId: string, responseData: Response) {
    const query = {
        _id: new ObjectId(attemptId),
        "responses._id": new ObjectId(responseId)
    };
    const result = await surveyorDb.collection<Response>(ATTEMPTS_COLLECTION).updateOne(query, responseData);
    return result.modifiedCount === 1;
}

export async function createResponse(attemptId: string, questionData: Response) {
    const query = {
        _id: new ObjectId(attemptId)
    }
    const data = {
        $push: {
            questions: questionData
        } 
    };
    const result = await surveyorDb.collection<Response>(ATTEMPTS_COLLECTION).updateOne(query, data);
}

export async function getResponseById(responseId: string, attemptId: string) {
    const query = {
        _id: new ObjectId(attemptId),
        "responses._id": new ObjectId(responseId)
    };
    const attempt = await surveyorDb.collection<Response>(ATTEMPTS_COLLECTION).findOne(query);
    return attempt;
}

export async function getResponseForQuestion(responseId: string, questionId: string) {
    const query = {
        question: questionId,
        "responses._id": new ObjectId(responseId),
        _id: new ObjectId(attemptId)
    };
    const attempt = await surveyorDb.collection<Response>(ATTEMPTS_COLLECTION).findOne(query);
    return attempt;
}