import { InvalidOperationError } from "../models/Errors/invalidOperationError";
import { NotFoundError } from "../models/Errors/notFoundError";
import { createAttempt, getAttemptById, getAttemptBySurveyAndUser, editExistingAttempt as editExistingAttemptDb } from "../repositories/attemptRepository";

export async function getExistingAttempt(surveyId: string, userId: string) {
    const existingAttempt = await getAttemptBySurveyAndUser(surveyId, userId);

    if (!existingAttempt) {
        throw new NotFoundError('Attempt not found');
    }

    if (existingAttempt.completedAt) {
        return null;
    }

    return {
        id: existingAttempt._id,
        survey: existingAttempt.survey,
        startedAt: existingAttempt.startedAt
    };
}

export async function createNewAttempt(surveyId: string, userId: string) {
    const existingAttempt = await getAttemptBySurveyAndUser(surveyId, userId);

    if (existingAttempt && existingAttempt.completedAt) {
        return {
        id: existingAttempt._id,
        survey: existingAttempt.survey,
        startedAt: existingAttempt.startedAt
        };
    }

   const newAttempt = await createAttempt(surveyId, userId);

    return {
        id: newAttempt._id,
        survey: newAttempt.survey,
        startedAt: newAttempt.startedAt
    };
}

export async function deleteExistingAttempt(attemptId: string, userId: string) {
    return deleteExistingAttempt(attemptId, userId);
}

export async function completeExistingAttempt(attemptId: string, userId: string) {
    const existingAttempt = await getAttemptById(attemptId);

    if (!existingAttempt) {
        throw new NotFoundError('Attempt not found');
    }

    if (existingAttempt?.completedAt) {
        throw new InvalidOperationError("Attempt already completed");
    }

    if (existingAttempt.user.toString() !== userId) {
        throw new NotFoundError('Attempt not found');
    }

    existingAttempt.completedAt = new Date();
    await editExistingAttemptDb(attemptId, userId, existingAttempt);

    return {
        id: existingAttempt._id,
        survey: existingAttempt.survey,
        startedAt: existingAttempt.startedAt,
        completedAt: existingAttempt.completedAt
    };
}