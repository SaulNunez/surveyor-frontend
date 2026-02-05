import { NotFoundError } from "../models/Errors/notFoundError";
import { BinaryChoiceResponse, LikertScaleResponse, MultipleChoiceResponse, OpenEndedResponse } from "../models/responseSchema";
import { QuestionResponseDao, MultipleChoiceResponseDao, BinaryChoiceResponseDao, LikertScaleResponseDao } from "../models/frontend/result";
import { createResponse, editResponse, getResponseForQuestion } from "../repositories/responseRepository";
import { getQuestionById } from "../repositories/questionRepository";
import { ResultAsync, ok, err, fromPromise } from "neverthrow";

// Helper to convert unknown error to Error
const toError = (e: unknown) => e instanceof Error ? e : new Error(String(e));

export function addResponseToQuestion(attemptId: string, questionId: string, surveyId: string, responsePayload: QuestionResponseDao) {
    return fromPromise(
        getQuestionById(questionId, surveyId),
        toError
    ).andThen(question => {
        if (!question) return err(new NotFoundError('Question not found'));

        if (responsePayload.questionType !== question.questionType) {
            return err(new Error('Response question type does not match the question type'));
        }

        let createPromise;
        switch (responsePayload.questionType) {
            case 'open-ended':
                createPromise = createResponse(attemptId, {
                    question: questionId,
                    response: responsePayload.response
                } as OpenEndedResponse);
                break;
            case 'likert-scale':
                if (responsePayload.selectedValue < 1 || responsePayload.selectedValue > 5) {
                    return err(new Error('Selected value must be between 1 and 5 for question'));
                }
                createPromise = createResponse(attemptId, {
                    question: questionId,
                    rating: responsePayload.selectedValue
                } as LikertScaleResponse);
                break;
            case 'multiple-choice':
                createPromise = createResponse(attemptId, {
                    question: questionId,
                    selectedOption: (responsePayload as MultipleChoiceResponseDao).selectedOptionIndex
                } as MultipleChoiceResponse);
                break;
            case 'binary-choice':
                createPromise = createResponse(attemptId, {
                    question: questionId,
                    choice: (responsePayload as BinaryChoiceResponseDao).selectedOption === 'positive'
                } as BinaryChoiceResponse);
                break;
            default:
                return err(new Error('Unsupported question type'));
        }

        return fromPromise(createPromise, toError);
    });
}

export function getExistingResponseInQuestion(attemptId: string, questionId: string) {
    return fromPromise(
        getResponseForQuestion(attemptId, questionId),
        toError
    ).andThen(response => {
        if (!response) return err(new NotFoundError('Response not found'));

        if (response.responseType === 'open-ended') {
            return ok({
                questionType: 'open-ended',
                response: response.response
            } as QuestionResponseDao);
        }
        if (response.responseType === 'likert-scale') {
            return ok({
                questionType: 'likert-scale',
                selectedValue: response.rating
            } as LikertScaleResponseDao);
        }
        if (response.responseType === 'multiple-choice') {
            return ok({
                questionType: 'multiple-choice',
                selectedOptionIndex: response.selectedOption
            } as MultipleChoiceResponseDao);
        }
        if (response.responseType === 'binary-choice') {
            return ok({
                questionType: 'binary-choice',
                selectedOption: response.choice ? 'positive' : 'negative'
            } as BinaryChoiceResponseDao);
        }

        return err(new Error('Unsupported response type'));
    });
}

export function updateResponseToQuestion(attemptId: string, responseId: string, questionId: string, responsePayload: QuestionResponseDao) {
    /*if (responsePayload.questionType !== response.responseType) {
        throw new Error('Response question type does not match the question type');
    }*/

    let updatePromise;

    if (responsePayload.questionType === 'open-ended') {
        updatePromise = editResponse(attemptId, responseId, {
            question: questionId,
            response: responsePayload.response
        } as OpenEndedResponse);
    }
    else if (responsePayload.questionType === 'likert-scale') {
        if ((responsePayload as LikertScaleResponseDao).selectedValue < 1 || (responsePayload as LikertScaleResponseDao).selectedValue > 5) {
            return err(new Error('Rating must be between 1 and 5 for question'));
        }
        updatePromise = editResponse(attemptId, responseId, {
            question: questionId,
            rating: (responsePayload as LikertScaleResponseDao).selectedValue
        } as LikertScaleResponse);
    }
    else if (responsePayload.questionType === 'multiple-choice') {
        updatePromise = editResponse(attemptId, responseId, {
            question: questionId,
            selectedOption: (responsePayload as MultipleChoiceResponseDao).selectedOptionIndex
        } as MultipleChoiceResponse);
    }
    else if (responsePayload.questionType === 'binary-choice') {
        updatePromise = editResponse(attemptId, responseId, {
            question: questionId,
            choice: (responsePayload as BinaryChoiceResponseDao).selectedOption === 'positive'
        } as BinaryChoiceResponse);
    } else {
        // Fallback or error if type isn't matched, though currently void logic implies success if not matched?
        // The original code did nothing if no if-block matched (implicitly).
        // I will return ok() but actually, the original code had if blocks, so if none matched it did nothing.
        // It's safer to probably assume one matches or is void.
        return ok(undefined);
    }

    return fromPromise(updatePromise, toError);
}