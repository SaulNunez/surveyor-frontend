import { db } from "../db";
import { responses, attempts, questions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { InvalidOperationError } from "../models/Errors/invalidOperationError";
import { NotFoundError } from "../models/Errors/notFoundError";
import { QuestionResponseDao, MultipleChoiceResponseDao, BinaryChoiceResponseDao, OpenEndedResponseDao, LikertScaleResponseDao } from "../models/frontend/result";

export async function addResponseToQuestion(attemptId: string, questionId: string, responsePayload: QuestionResponseDao){
    const questionResults = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if(questionResults.length === 0) throw new NotFoundError('Question not found');

    const attemptResults = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
    if(attemptResults.length === 0) throw new NotFoundError('Attempt not found');
    
    const existingResponseResults = await db.select()
        .from(responses)
        .where(and(eq(responses.attemptId, attemptId), eq(responses.questionId, questionId)))
        .limit(1);
    
    if(existingResponseResults.length > 0){
        throw new InvalidOperationError('Response to this question already exists in the attempt');
    }

    const insertValues: any = {
        attemptId,
        questionId,
        responseType: responsePayload.questionType
    };

    switch(responsePayload.questionType){
        case 'open-ended':
            insertValues.response = (responsePayload as OpenEndedResponseDao).response;
            break;
        case 'likert-scale':
            const rating = (responsePayload as LikertScaleResponseDao).selectedValue;
            if(rating < 1 || rating > 5) {
                throw new Error('Selected value must be between 1 and 5 for question');
            }
            insertValues.rating = rating;
            break;
        case 'multiple-choice':
            insertValues.selectedOption = (responsePayload as MultipleChoiceResponseDao).selectedOptionIndex;
            break;
        case 'binary-choice':
            insertValues.choice = (responsePayload as BinaryChoiceResponseDao).selectedOption === 'positive';
            break;
        default:
            throw new Error('Unsupported question type');
    }

    await db.insert(responses).values(insertValues);

    const attempt = attemptResults[0];
    const attemptResponses = await db.select().from(responses).where(eq(responses.attemptId, attemptId));

    return {
        ...attempt,
        _id: attempt.id,
        responses: attemptResponses.map(r => ({
            ...r,
            _id: r.id,
            question: r.questionId,
        }))
    };
}

export async function getExistingResponseInQuestion(attemptId: string, questionId: string){
    const questionResults = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if(questionResults.length === 0) throw new NotFoundError('Question not found');

    const attemptResults = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
    if(attemptResults.length === 0) throw new NotFoundError('Attempt not found');
    
    const results = await db.select()
        .from(responses)
        .where(and(eq(responses.attemptId, attemptId), eq(responses.questionId, questionId)))
        .limit(1);

    if(results.length === 0) throw new NotFoundError('Response not found');

    const response = results[0];
    return {
        ...response,
        _id: response.id,
        question: response.questionId
    };
}

export async function updateResponseToQuestion(attemptId: string, questionId: string, responsePayload: QuestionResponseDao){
    const questionResults = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if(questionResults.length === 0) throw new NotFoundError('Question not found');

    const attemptResults = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
    if(attemptResults.length === 0) throw new NotFoundError('Attempt not found');
    
    const results = await db.select()
        .from(responses)
        .where(and(eq(responses.attemptId, attemptId), eq(responses.questionId, questionId)))
        .limit(1);

    if(results.length === 0) throw new NotFoundError('Response not found');

    const response = results[0];
    const updateValues: any = {};

    switch(response.responseType){
        case 'open-ended':
            updateValues.response = (responsePayload as OpenEndedResponseDao).response;
            break;
        case 'multiple-choice':
            updateValues.selectedOption = (responsePayload as MultipleChoiceResponseDao).selectedOptionIndex;
            break;
        case 'binary-choice':
            updateValues.choice = (responsePayload as BinaryChoiceResponseDao).selectedOption === 'positive';
            break;
        case 'likert-scale':
            const rating = (responsePayload as LikertScaleResponseDao).selectedValue;
            if(rating < 1 || rating > 5) {
                throw new Error('Rating must be between 1 and 5 for question');
            }
            updateValues.rating = rating;
            break;
        default:
            throw new Error('Unsupported question type');
    }

    const updated = await db.update(responses)
        .set(updateValues)
        .where(and(eq(responses.attemptId, attemptId), eq(responses.questionId, questionId)))
        .returning();

    const r = updated[0];
    return {
        ...r,
        _id: r.id,
        question: r.questionId
    };
}