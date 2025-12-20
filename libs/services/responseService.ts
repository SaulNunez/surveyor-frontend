import { NotFoundError } from "../models/Errors/notFoundError";
import { BinaryChoiceResponse, LikertScaleResponse, MultipleChoiceResponse, OpenEndedResponse } from "../models/responseSchema";
import { QuestionResponseDao, MultipleChoiceResponseDao, BinaryChoiceResponseDao, LikertScaleResponseDao } from "../models/frontend/result";
import { createResponse, editResponse, getResponseForQuestion } from "../repositories/responseRepository";
import { getQuestionById } from "../repositories/questionRepository";

export async function addResponseToQuestion(attemptId: string, questionId: string, surveyId: string, responsePayload: QuestionResponseDao) {
    const question = await getQuestionById(questionId, surveyId);
    if (!question) throw new NotFoundError('Question not found');

    if (responsePayload.questionType !== question.questionType) {
        throw new Error('Response question type does not match the question type');
    }

    switch (responsePayload.questionType) {
        case 'open-ended':
            await createResponse(attemptId, {
                question: questionId,
                response: responsePayload.response
            } as OpenEndedResponse);
            break;
        case 'likert-scale':
            if (responsePayload.selectedValue < 1 || responsePayload.selectedValue > 5) {
                throw new Error('Selected value must be between 1 and 5 for question');
            }
            await createResponse(attemptId, {
                question: questionId,
                rating: responsePayload.selectedValue
            } as LikertScaleResponse);
            break;
        case 'multiple-choice':
            await createResponse(attemptId, {
                question: questionId,
                selectedOption: (responsePayload as MultipleChoiceResponseDao).selectedOptionIndex
            } as MultipleChoiceResponse);
            break;
        case 'binary-choice':
            await createResponse(attemptId, {
                question: questionId,
                choice: (responsePayload as BinaryChoiceResponseDao).selectedOption === 'positive'
            } as BinaryChoiceResponse);
            break;
        default:
            throw new Error('Unsupported question type');
    }
}

export async function getExistingResponseInQuestion(attemptId: string, questionId: string) {
    const response = await getResponseForQuestion(attemptId, questionId);
    if (!response) throw new NotFoundError('Response not found');

    if(response.responseType === 'open-ended') {
        return {
            questionType: 'open-ended',
            response: response.response
        } as QuestionResponseDao;
    }
    if(response.responseType === 'likert-scale') {
        return {
            questionType: 'likert-scale',
            selectedValue: response.rating
        } as LikertScaleResponseDao;
    }
    if(response.responseType === 'multiple-choice') {
        return {
            questionType: 'multiple-choice',
            selectedOptionIndex: response.selectedOption
        } as MultipleChoiceResponseDao;
    }
    if(response.responseType === 'binary-choice') {
        return {
            questionType: 'binary-choice',
            selectedOption: response.choice ? 'positive' : 'negative'
        } as BinaryChoiceResponseDao;
    }
    
    throw new Error('Unsupported response type');
}

export async function updateResponseToQuestion(attemptId: string, responseId: string, questionId: string, responsePayload: QuestionResponseDao) {
    /*if (responsePayload.questionType !== response.responseType) {
        throw new Error('Response question type does not match the question type');
    }*/

    if (responsePayload.questionType === 'open-ended') {
        await editResponse(attemptId, responseId, {
            question: questionId,
            response: responsePayload.response
        } as OpenEndedResponse);
    }
    if (responsePayload.questionType === 'likert-scale') {
        if ((responsePayload as LikertScaleResponseDao).selectedValue < 1 || (responsePayload as LikertScaleResponseDao).selectedValue > 5) {
            throw new Error('Rating must be between 1 and 5 for question');
        }
        await editResponse(attemptId, responseId, {
            question: questionId,
            rating: (responsePayload as LikertScaleResponseDao).selectedValue
        } as LikertScaleResponse);
    }
    if (responsePayload.questionType === 'multiple-choice') {
        await editResponse(attemptId, responseId, {
            question: questionId,
            selectedOption: (responsePayload as MultipleChoiceResponseDao).selectedOptionIndex
        } as MultipleChoiceResponse);
    }
    if (responsePayload.questionType === 'binary-choice') {
        await editResponse(attemptId, responseId, {
            question: questionId,
            choice: (responsePayload as BinaryChoiceResponseDao).selectedOption === 'positive'
        } as BinaryChoiceResponse);
    }
}