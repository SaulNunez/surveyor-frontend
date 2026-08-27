import { db } from "../db";
import { Executor } from "../db/executor";
import { responses, attempts, questions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError } from "../models/Errors/notFoundError";
import { QuestionResponseInput } from "../models/frontend/result";

type ResponseInsert = typeof responses.$inferInsert;

/**
 * Maps a response onto the single-table-inheritance columns. Every column that
 * does not belong to this question type is written as null, so changing a
 * question's type cannot leave a stale value behind from the previous answer.
 */
function toResponseColumns(responsePayload: QuestionResponseInput) {
    const columns = {
        responseType: responsePayload.questionType,
        response: null as string | null,
        selectedOption: null as number | null,
        choice: null as boolean | null,
        rating: null as number | null,
    };

    switch (responsePayload.questionType) {
        case 'open-ended':
            return { ...columns, response: responsePayload.response };
        case 'multiple-choice':
            return { ...columns, selectedOption: responsePayload.selectedOptionIndex };
        case 'binary-choice':
            return { ...columns, choice: responsePayload.selectedOption === 'positive' };
        case 'likert-scale': {
            const rating = responsePayload.selectedValue;
            if (rating < 1 || rating > 5) {
                throw new Error('Selected value must be between 1 and 5 for question');
            }
            return { ...columns, rating };
        }
        default: {
            const unsupported: never = responsePayload;
            throw new Error(`Unsupported question type: ${JSON.stringify(unsupported)}`);
        }
    }
}

/**
 * Records the user's answer to a question, replacing any previous answer.
 *
 * Upsert rather than select-then-insert: two concurrent saves of the same
 * answer would both find nothing and both insert, so
 * `responses_attempt_question_unique` arbitrates and the loser updates.
 */
export async function saveResponse(
    attemptId: string,
    questionId: string,
    responsePayload: QuestionResponseInput,
    executor: Executor = db
) {
    const questionResults = await executor.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if (questionResults.length === 0) throw new NotFoundError('Question not found');

    const attemptResults = await executor.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
    if (attemptResults.length === 0) throw new NotFoundError('Attempt not found');

    const columns = toResponseColumns(responsePayload);
    const values: ResponseInsert = { attemptId, questionId, ...columns };

    const saved = await executor.insert(responses)
        .values(values)
        .onConflictDoUpdate({
            target: [responses.attemptId, responses.questionId],
            set: columns,
        })
        .returning();

    return saved[0];
}

export async function getExistingResponseInQuestion(attemptId: string, questionId: string, executor: Executor = db) {
    const questionResults = await executor.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if (questionResults.length === 0) throw new NotFoundError('Question not found');

    const attemptResults = await executor.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
    if (attemptResults.length === 0) throw new NotFoundError('Attempt not found');

    const results = await executor.select()
        .from(responses)
        .where(and(eq(responses.attemptId, attemptId), eq(responses.questionId, questionId)))
        .limit(1);

    if (results.length === 0) throw new NotFoundError('Response not found');

    return results[0];
}

export async function getResponsesForAttempt(attemptId: string, executor: Executor = db) {
    return await executor.select().from(responses).where(eq(responses.attemptId, attemptId));
}
