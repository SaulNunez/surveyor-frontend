import { ObjectId } from "mongodb";
import { Survey } from "../models/surveySchema";
import { surveyorDb } from "./database";

const SURVEY_COLLECTION = 'surveys';

export async function deleteSurvey(surveyId: string, userId: string) {
    const query = {
        _id: new ObjectId(surveyId),
        user: userId 
    };
    const result = await surveyorDb.collection(SURVEY_COLLECTION).deleteOne(query);
    return result.deletedCount === 1;
}

export async function editSurvey(surveyId: string, userId: string, title: string, description: string) {
        const query = {
        _id: new ObjectId(surveyId),
        user: userId
    };
    const surveyData = {
        title: title,
        description: description,
        lastUpdated: new Date()
    };
    const result = await surveyorDb.collection(SURVEY_COLLECTION).updateOne(query, surveyData);
    return result.modifiedCount === 1;
}

export async function createSurvey(userId: string, title: string, description: string) {
    const survey : Survey = {
        user: userId,
        questions: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        title: title,
        description: description
    };
    await surveyorDb.collection(SURVEY_COLLECTION).insertOne(survey);
    return survey;
}

export async function getAttemptById(surveyId: string) {
    const query = { _id: new ObjectId(surveyId) };
    const survey = await surveyorDb.collection(SURVEY_COLLECTION).findOne(query);
    return survey;
}