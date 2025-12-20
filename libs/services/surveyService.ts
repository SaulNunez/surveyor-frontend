import { NotFoundError } from "../models/Errors/notFoundError";
import * as surveyRepository from "../repositories/surveyRepository";

export async function getAllSurveysForUser(userId: string) {
    const surveys = await surveyRepository.getSurveysByUser(userId);

    return surveys.map(survey => ({
        id: survey._id,
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt
    }));
}

export async function getSurvey(surveyId: string) {
    const survey = await surveyRepository.getSurveyById(surveyId);

    if(!survey) {
        throw new NotFoundError('Survey not found');
    }

    return {
        id: survey._id,
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt
    }
}

export async function createSurvey(title: string, description: string, userId: string) {
    const survey = await surveyRepository.createSurvey(userId, title, description);

    return {
        id: survey._id,
        title: survey.title,
        description: survey.description
    }
}

export async function editSurvey(surveyId: string, userId: string, title: string, description: string) {
    const survey = await surveyRepository.getSurveyById(surveyId);

    if(!survey) {
        throw new NotFoundError('Survey not found');
    }

    if(survey.user.toString() !== userId) {
        throw new NotFoundError('Survey not found');
    }

    const updatedSurvey = await surveyRepository.updateSurvey(surveyId, userId, title, description );
    return {
        id: updatedSurvey._id,
        title: updatedSurvey.title,
        description: updatedSurvey.description
    }
}

export async function deleteSurvey(surveyId: string, userId: string) {
    const survey = await surveyRepository.getSurveyById(surveyId);

    if(!survey) {
        throw new NotFoundError('Survey not found');
    }

    if(survey.user.toString() !== userId) {
        throw new NotFoundError('Survey not found');
    }

    await surveyRepository.deleteSurvey(surveyId, userId);
    return true;
}