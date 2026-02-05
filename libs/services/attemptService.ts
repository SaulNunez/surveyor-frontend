import { InvalidOperationError } from "../models/Errors/invalidOperationError";
import { NotFoundError } from "../models/Errors/notFoundError";
import { Question, QuestionBase, QuestionType } from "../models/questionSchema";
import { BinaryChoiceResult, LikertScaleResult, MultipleChoiceResult, OpenEndedResult } from "../models/resultSchema";
import { createAttempt, getAttemptById, getAttemptBySurveyAndUser, editExistingAttempt as editExistingAttemptDb, deleteAttempt, getCompletedAttemptsBySurvey } from "../repositories/attemptRepository";
import { ResultAsync, ok, err, fromPromise } from "neverthrow";
import { Response } from "../models/responseSchema";
import { getSurveyById } from "../repositories/surveyRepository";

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

function calculateResult(question: Question, responses: Response[]) {
    // Initialize common fields
    const baseResult = {
        questionId: question._id!.toString(),
        questionType: question.questionType,
        createdAt: new Date(),
        lastUpdated: new Date()
    };

    switch (question.questionType) {
        case QuestionType.OPEN_ENDED:
            const openEndedResponses = responses as import("../models/responseSchema").OpenEndedResponse[];
            return {
                ...baseResult,
                representativeQuotes: openEndedResponses.map(r => r.response),
                totalResponses: responses.length,
                thematicTags: [] // Placeholder for future implementation
            } as OpenEndedResult;

        case QuestionType.MULTIPLE_CHOICE:
            const mcQuestion = question as import("../models/questionSchema").MultipleChoiceQuestion;
            const mcResponses = responses as import("../models/responseSchema").MultipleChoiceResponse[];

            // Initialize sums with 0 for each option
            const mcSelectionSum = new Array(mcQuestion.options.length).fill(0);

            mcResponses.forEach(r => {
                if (r.selectedOption >= 0 && r.selectedOption < mcSelectionSum.length) {
                    mcSelectionSum[r.selectedOption]++;
                }
            });

            return {
                ...baseResult,
                selectionSum: mcSelectionSum
            } as MultipleChoiceResult;

        case QuestionType.BINARY_CHOICE:
            const bcResponses = responses as import("../models/responseSchema").BinaryChoiceResponse[];
            let positiveCount = 0;
            let negativeCount = 0;

            bcResponses.forEach(r => {
                if (r.choice) {
                    positiveCount++;
                } else {
                    negativeCount++;
                }
            });

            return {
                ...baseResult,
                positiveSelectionSum: positiveCount,
                negativeSelectionSum: negativeCount
            } as BinaryChoiceResult;

        case QuestionType.LIKERT_SCALE:
            const lsQuestion = question as import("../models/questionSchema").LikertScaleQuestion;
            const lsResponses = responses as import("../models/responseSchema").LikertScaleResponse[];

            // Initialize sums with 0 for each option (Likert scale options usually map to array indices or specific values)
            // Assuming options array length corresponds to the range of ratings.
            // However, LikertScaleResponse has 'rating: number'. 
            // If explicit options are provided, we map to them. 
            // If we assume rating is 0-indexed index of option:
            const lsSelectionSum = new Array(lsQuestion.options.length).fill(0);

            lsResponses.forEach(r => {
                if (r.rating >= 0 && r.rating < lsSelectionSum.length) {
                    lsSelectionSum[r.rating]++;
                }
            });

            return {
                ...baseResult,
                selectionSum: lsSelectionSum
            } as LikertScaleResult;

        default:
            throw new Error(`Unsupported question type: ${(question as any).questionType}`);
    }
}

export async function obtainResultsOutOfCompletedAttempts(surveyId: string) {
    const attempts = await getCompletedAttemptsBySurvey(surveyId);

    // Group responses by question ID
    const responsesByQuestionId = attempts.flatMap(attempt => attempt.responses).reduce((acc, response) => {
        if (acc.has(response.question)) {
            acc.get(response.question)!.push(response);
        } else {
            acc.set(response.question, [response]);
        }
        return acc;
    }, new Map<string, Response[]>());

    // Fetch survey to get question definitions
    const survey = await getSurveyById(surveyId);
    if (!survey) {
        throw new NotFoundError("Survey not found");
    }

    const results = survey.questions.map(question => {
        const questionId = question._id!.toString();
        const responses = responsesByQuestionId.get(questionId) || [];
        return calculateResult(question, responses);
    });

    return results;
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