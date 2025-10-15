import { NotFoundError } from "../models/Errors/notFoundError";
import { SurveyModel } from "../models/surveySchema";

export async function getAllSurveysForUser(userId: string) {
    const surveys = await SurveyModel.find({user: userId}).exec();

    return surveys.map(survey => ({
        id: survey._id,
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt
    }));
}

export async function getSurvey(surveyId: string) {
    const survey = await SurveyModel.findById(surveyId).exec();

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
    const survey = await SurveyModel.create({ title, description, user: userId });

    return {
        id: survey._id,
        title: survey.title,
        description: survey.description
    }
}

export async function editSurvey(surveyId: string, userId: string, title: string, description: string) {
    const survey = await SurveyModel.findById(surveyId).exec();

    if(!survey) {
        throw new NotFoundError('Survey not found');
    }

    if(survey.user.toString() !== userId) {
        throw new NotFoundError('Survey not found');
    }

    survey.title = title;
    survey.description = description;

    await survey.save();
    return {
        id: survey._id,
        title: survey.title,
        description: survey.description
    }
}

export async function deleteSurvey(surveyId: string, userId: string) {
    const survey = await SurveyModel.findById(surveyId).exec();

    if(!survey) {
        throw new NotFoundError('Survey not found');
    }

    if(survey.user.toString() !== userId) {
        throw new NotFoundError('Survey not found');
    }

    await SurveyModel.deleteOne({ _id: surveyId }).exec();
    return true;
}