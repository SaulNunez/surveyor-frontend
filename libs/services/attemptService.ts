import { InvalidOperationError } from "../models/Errors/invalidOperationError";
import { NotFoundError } from "../models/Errors/notFoundError";
import { Question, QuestionBase, QuestionType } from "../models/questionSchema";
import { BinaryChoiceResult, LikertScaleResult, MultipleChoiceResult, OpenEndedResult } from "../models/resultSchema";
import { createAttempt, getAttemptById, getAttemptBySurveyAndUser, editExistingAttempt as editExistingAttemptDb, deleteAttempt } from "../repositories/attemptRepository";
import { ResultAsync, ok, err, fromPromise } from "neverthrow";

// Helper to convert unknown error to Error
const toError = (e: unknown) => e instanceof Error ? e : new Error(String(e));

export function getExistingAttempt(surveyId: string, userId: string) {
    return fromPromise(
        getAttemptBySurveyAndUser(surveyId, userId),
        toError
    ).andThen(existingAttempt => {
        if (!existingAttempt) {
            return err(new NotFoundError('Attempt not found'));
        }

        if (existingAttempt.completedAt) {
            return ok(null);
        }

        return ok({
            id: existingAttempt._id.toString(),
            survey: existingAttempt.survey,
            startedAt: existingAttempt.startedAt
        });
    });
}

export function createNewAttempt(surveyId: string, userId: string) {
    return fromPromise(
        getAttemptBySurveyAndUser(surveyId, userId),
        toError
    ).andThen(existingAttempt => {
        if (existingAttempt && existingAttempt.completedAt) {
            return ok({
                id: existingAttempt._id.toString(),
                survey: existingAttempt.survey,
                startedAt: existingAttempt.startedAt
            });
        }

        // If not completed or doesn't exist, create new
        return fromPromise(
            createAttempt(surveyId, userId),
            toError
        ).andThen(newAttemptId =>
            fromPromise(
                getAttemptById(newAttemptId),
                toError
            )
        ).andThen(newAttempt => {
            if (!newAttempt) {
                return err(new InvalidOperationError('Could not create attempt'));
            }
            return ok({
                id: newAttempt._id.toString(),
                survey: newAttempt.survey,
                startedAt: newAttempt.startedAt
            });
        });
    });
}

export function deleteExistingAttempt(attemptId: string, userId: string) {
    return fromPromise(
        getAttemptById(attemptId),
        toError
    ).andThen(existingAttempt => {
        if (!existingAttempt || existingAttempt.user.toString() !== userId) {
            return err(new NotFoundError('Attempt not found'));
        }
        return ok(existingAttempt);
    }).andThen(() =>
        fromPromise(
            deleteAttempt(attemptId, userId),
            toError
        )
    ).andThen(deleteRes => {
        if (!deleteRes) {
            return err(new InvalidOperationError('Could not delete attempt'));
        }
        return ok(true);
    });
}

function calculateResult(question: Question, answer: string) {
    switch (question.questionType) {
        case QuestionType.OPEN_ENDED:
            return {
                questionId: question._id!.toString(),
                questionType: question.questionType,
                representativeQuotes: [answer],
                totalResponses: 1,
                thematicTags: [],
                createdAt: new Date(),
                lastUpdated: new Date()
            } as OpenEndedResult;
        case QuestionType.MULTIPLE_CHOICE:
            return {
                questionId: question._id!.toString(),
                questionType: question.questionType,
                selectionSum: question.options.map((_, index) => answer === question.options[index] ? 1 : 0),
                createdAt: new Date(),
                lastUpdated: new Date()
            } as MultipleChoiceResult;
        case QuestionType.BINARY_CHOICE:
            return {
                questionId: question._id!.toString(),
                questionType: question.questionType,
                positiveSelectionSum: answer === question.positiveLabel ? 1 : 0,
                negativeSelectionSum: answer === question.negativeLabel ? 1 : 0,
                createdAt: new Date(),
                lastUpdated: new Date()
            } as BinaryChoiceResult;
        case QuestionType.LIKERT_SCALE:
            return {
                questionId: question._id!.toString(),
                questionType: question.questionType,
                selectionSum: question.options.map((_, index) => answer === question.options[index] ? 1 : 0),
                createdAt: new Date(),
                lastUpdated: new Date()
            } as LikertScaleResult;
    }
}

export function completeExistingAttempt(attemptId: string, userId: string) {
    return fromPromise(
        getAttemptById(attemptId),
        toError
    ).andThen(existingAttempt => {
        if (!existingAttempt) {
            return err(new NotFoundError('Attempt not found'));
        }

        if (existingAttempt.completedAt) {
            return err(new InvalidOperationError("Attempt already completed"));
        }

        if (existingAttempt.user.toString() !== userId) {
            return err(new NotFoundError('Attempt not found'));
        }

        existingAttempt.completedAt = new Date();
        return fromPromise(
            editExistingAttemptDb(attemptId, userId, existingAttempt),
            toError
        ).map(() => ({
            id: existingAttempt._id.toString(),
            survey: existingAttempt.survey,
            startedAt: existingAttempt.startedAt,
            completedAt: existingAttempt.completedAt
        }));
    });
}