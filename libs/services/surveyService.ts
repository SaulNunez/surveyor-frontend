import { NotFoundError } from "../models/Errors/notFoundError";
import * as surveyRepository from "../repositories/surveyRepository";
import { ResultAsync, ok, err, fromPromise } from "neverthrow";

// Helper to convert unknown error to Error
const toError = (e: unknown) => e instanceof Error ? e : new Error(String(e));

export function getAllSurveysForUser(userId: string) {
    return fromPromise(
        surveyRepository.getSurveysByUser(userId),
        toError
    ).map(surveys => surveys.map(survey => ({
        id: survey._id.toString(),
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt
    })));
}

export function getSurvey(surveyId: string) {
    return fromPromise(
        surveyRepository.getSurveyById(surveyId),
        toError
    ).andThen((survey) => {
        if (!survey) {
            return err(new NotFoundError('Survey not found'));
        }
        return ok({
            id: survey._id.toString(),
            title: survey.title,
            description: survey.description,
            createdAt: survey.createdAt
        });
    });
}

export function createSurvey(title: string, description: string, userId: string) {
    return fromPromise(
        surveyRepository.createSurvey(userId, title, description),
        toError
    ).map(newSurveyId => ({
        id: newSurveyId,
        title: title,
        description: description
    }));
}

export function editSurvey(surveyId: string, userId: string, title: string, description: string) {
    // We can chain the logic: getSurvey -> check ownership -> update
    return fromPromise(
        surveyRepository.getSurveyById(surveyId),
        toError
    ).andThen(survey => {
        if (!survey) {
            return err(new NotFoundError('Survey not found'));
        }
        if (survey.user.toString() !== userId) {
            // Original code threw NotFoundError for unauthorized access too, keeping consistent
            return err(new NotFoundError('Survey not found'));
        }
        return ok(survey);
    }).andThen(() =>
        fromPromise(
            surveyRepository.updateSurvey(surveyId, userId, title, description),
            toError
        )
    ).map((updatedSurvey) => ({
        id: surveyId,
        title: updatedSurvey.title,
        description: updatedSurvey.description
    }));
}

export function deleteSurvey(surveyId: string, userId: string) {
    return fromPromise(
        surveyRepository.getSurveyById(surveyId),
        toError
    ).andThen(survey => {
        if (!survey) {
            return err(new NotFoundError('Survey not found'));
        }
        if (survey.user.toString() !== userId) {
            return err(new NotFoundError('Survey not found'));
        }
        return ok(survey);
    }).andThen(() =>
        fromPromise(
            surveyRepository.deleteSurvey(surveyId, userId),
            toError
        )
    );
}