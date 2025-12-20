import { Question } from "../models/questionSchema";

const SURVEY_COLLECTION = 'surveys';

export async function deleteQuestion(questionId: string, surveyId: string) {
    const query = {
        _id: surveyId,
        questions: { $elemMatch: { id: questionId } }
    };
    const result = surveyorDb.collection(SURVEY_COLLECTION).deleteOne(query);
    return result.deletedCount === 1;
}

export async function editExistingQuestion(surveyId: string, questionId: string, questionData: Question) {
    const query = {
        "questions._id": questionId
    };
    const result = surveyorDb.collection(SURVEY_COLLECTION).updateOne(query, questionData);
    return result.modifiedCount === 1;
}

export async function createQuestion(surveyId: string, questionData: Question) {
    const query = {
        _id: surveyId
    }
    const data = {
        $push: {
            questions: questionData
        } 
    };
    const result = await surveyorDb.collection(SURVEY_COLLECTION).updateOne(query, data);
}

export async function getQuestionById(questionId: string, surveyId: string) {
        const query = {
        _id: surveyId,
        questions: { $elemMatch: { id: questionId } }
    };
    const attempt = await surveyorDb.collection(SURVEY_COLLECTION).findOne(query);
    return attempt;
}