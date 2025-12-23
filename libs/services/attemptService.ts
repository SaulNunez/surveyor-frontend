import { InvalidOperationError } from "../models/Errors/invalidOperationError";
import { NotFoundError } from "../models/Errors/notFoundError";
import { createAttempt, getAttemptById, getAttemptBySurveyAndUser, editExistingAttempt as editExistingAttemptDb, deleteAttempt } from "../repositories/attemptRepository";

export async function getExistingAttempt(surveyId: string, userId: string) {
    const existingAttempt = await getAttemptBySurveyAndUser(surveyId, userId);

    if (!existingAttempt) {
        throw new NotFoundError('Attempt not found');
    }

    if (existingAttempt.completedAt) {
        return null;
    }

    return {
        id: existingAttempt._id.toString(),
        survey: existingAttempt.survey,
        startedAt: existingAttempt.startedAt
    };
}

export async function createNewAttempt(surveyId: string, userId: string) {
    const existingAttempt = await getAttemptBySurveyAndUser(surveyId, userId);

    if (existingAttempt && existingAttempt.completedAt) {
        return {
        id: existingAttempt._id.toString(),
        survey: existingAttempt.survey,
        startedAt: existingAttempt.startedAt
        };
    }

   const newAttemptId = await createAttempt(surveyId, userId);
   const newAttempt = await getAttemptById(newAttemptId);

   if (!newAttempt) {
    throw new InvalidOperationError('Could not create attempt');
   }

    return {
        id: newAttemptId.toString(),
        survey: newAttempt.survey,
        startedAt: newAttempt.startedAt
    };
}

export async function deleteExistingAttempt(attemptId: string, userId: string): Promise<boolean> {
    const existingAttempt = await getAttemptById(attemptId);

    if (!existingAttempt || existingAttempt.user.toString() !== userId) {
        throw new NotFoundError('Attempt not found');
    }
    const deleteRes =  deleteAttempt(attemptId, userId);

    if (!deleteRes) {
        throw new InvalidOperationError('Could not delete attempt');
    }

    return true;
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
        id: existingAttempt._id.toString(),
        survey: existingAttempt.survey,
        startedAt: existingAttempt.startedAt,
        completedAt: existingAttempt.completedAt
    };
}