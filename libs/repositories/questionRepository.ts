import { ObjectId } from "mongodb";
import { Question } from "../models/questionSchema";
import { surveyorDb } from "./database";

const SURVEY_COLLECTION = 'surveys';

export async function deleteQuestion(questionId: string, surveyId: string) {
    const query = {
        _id: new ObjectId(surveyId),
        "questions._id": new ObjectId(questionId)
    };
    const result = await surveyorDb.collection<Question>(SURVEY_COLLECTION).deleteOne(query);
    return result.deletedCount === 1;
}

export async function editQuestion(surveyId: string, questionId: string, questionData: Question) {
    const query = {
        _id: new ObjectId(surveyId),
        "questions._id": new ObjectId(questionId)
    };
    const result = await surveyorDb.collection<Question>(SURVEY_COLLECTION).updateOne(query, questionData);
    return result.modifiedCount === 1;
}

export async function createQuestion(surveyId: string, questionData: Question) {
    const query = {
        _id: new ObjectId(surveyId)
    }
    const data = {
        $push: {
            questions: questionData
        } 
    };
    const result = await surveyorDb.collection<Question>(SURVEY_COLLECTION).updateOne(query, data);
}

export async function getQuestionById(questionId: string, surveyId: string) {
        const query = {
         _id: new ObjectId(surveyId),
        "questions._id": new ObjectId(questionId)
    };
    const attempt = await surveyorDb.collection<Question>(SURVEY_COLLECTION).findOne(query);
    return attempt;
}