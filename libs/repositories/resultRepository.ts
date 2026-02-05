import { ObjectId } from "mongodb";
import { surveyorDb } from "./database";
import { Survey } from "../models/surveySchema";
import { ResultBase } from "../models/resultSchema";

const SURVEY_COLLECTION = 'surveys';

export async function getCurrentStatisticsForSurvey(surveyId: string, questionId: string) {
    const query = {
        _id: new ObjectId(surveyId),
        "questions._id": new ObjectId(questionId)
    };
    const options = {
        projection: { "questions.$": 1 }
    };
    const survey = await surveyorDb.collection<Survey>(SURVEY_COLLECTION).findOne(query, options);

    if (!survey || !survey.questions || survey.questions.length === 0) {
        return null;
    }

    return survey.questions[0].results || null;
}

export async function updateOrCreateResultForQuestion(surveyId: string, questionId: string, result: ResultBase) {
    const query = {
        _id: new ObjectId(surveyId),
        "questions._id": new ObjectId(questionId)
    };
    const insert = { $set: { "questions.$.results": result } };
    const options = {
        upsert: true
    }
    const survey = await surveyorDb.collection<Survey>(SURVEY_COLLECTION).updateOne(query, insert, options);

    if (!survey.acknowledged) {
        return false;
    }
    return true;
}