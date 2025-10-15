import mongoose from "mongoose";
import { AttemptModel } from "../models/attemptSchema";
import { InvalidOperationError } from "../models/Errors/invalidOperationError";
import { NotFoundError } from "../models/Errors/notFoundError";
import { LikertScaleQuestion, QuestionModel, QuestionType } from "../models/questionSchema";
import { BinaryChoiceResponse, LikertScaleResponse, MultipleChoiceResponse, OpenEndedResponse } from "../models/responseSchema";
import { QuestionResponseDao, MultipleChoiceResponseDao, BinaryChoiceResponseDao, OpenEndedResponseDao, LikertScaleResponseDao } from "../models/frontend/result";
import { v4 as uuidv4 } from 'uuid';

export async function addResponseToQuestion(attemptId: string, questionId: string, responsePayload: QuestionResponseDao){
    const question = await QuestionModel.findById(questionId);
    if(!question) throw new NotFoundError('Question not found');

    const attempt = await AttemptModel.findById(attemptId);
    if(!attempt) throw new NotFoundError('Attempt not found');
    
    if(attempt.responses?.some(resp => resp.question.toString() === questionId)){
        throw new InvalidOperationError('Response to this question already exists in the attempt');
    }

    switch(responsePayload.questionType){
        case 'open-ended':
                attempt.responses?.push({
                    _id: uuidv4(),
                    question: questionId,
                    response: responsePayload.response
                } as OpenEndedResponse);
                break;
        case 'likert-scale':
                if(responsePayload.selectedValue < 1 || responsePayload.selectedValue > 5) {
                    throw new Error('Selected value must be between 1 and 5 for question');
                }
                attempt.responses?.push({
                    _id: uuidv4(),
                    question: questionId,
                    rating: responsePayload.selectedValue
                } as LikertScaleResponse);
                break;
        case 'multiple-choice':
                attempt.responses?.push({
                    _id: uuidv4(),
                    question: questionId,
                    selectedOption: (responsePayload as MultipleChoiceResponseDao).selectedOptionIndex
                } as MultipleChoiceResponse);
                break;
        case 'binary-choice':
            attempt.responses?.push({
                _id: uuidv4(),
                question: questionId,
                choice: (responsePayload as BinaryChoiceResponseDao).selectedOption === 'positive'
            } as BinaryChoiceResponse);
            break;
        default:
            throw new Error('Unsupported question type');
        }
    return attempt.save();
}

export async function getExistingResponseInQuestion(attemptId: string, questionId: string){
    const question = await QuestionModel.findById(questionId);
    if(!question) throw new NotFoundError('Question not found');

    const attempt = await AttemptModel.findById(attemptId);
    if(!attempt) throw new NotFoundError('Attempt not found');
    
    let response =  attempt.responses?.find(resp => resp.question.toString() === questionId);
    if(!response) throw new NotFoundError('Response not found');

    return response;
}

export async function updateResponseToQuestion(attemptId: string, questionId: string, responsePayload: QuestionResponseDao){
    const question = await QuestionModel.findById(questionId);
    if(!question) throw new NotFoundError('Question not found');

    const attempt = await AttemptModel.findById(attemptId);
    if(!attempt) throw new NotFoundError('Attempt not found');
    
    let response =  attempt.responses?.find(resp => resp.question.toString() === questionId);
    if(!response) throw new NotFoundError('Response not found');

    switch(response.responseType){
        case 'open-ended':
            (response as OpenEndedResponse).response = (responsePayload as OpenEndedResponseDao).response;
            attempt.save();
            break;
        case 'multiple-choice':
            (response as MultipleChoiceResponse).selectedOption = (responsePayload as MultipleChoiceResponseDao).selectedOptionIndex;
            attempt.save();
            break;
        case 'binary-choice':
            (response as BinaryChoiceResponse).choice = (responsePayload as BinaryChoiceResponseDao).selectedOption === 'positive';
            attempt.save(); 
            break;
        case 'likert-scale':
            if((responsePayload as LikertScaleResponseDao).selectedValue < 1 || (responsePayload as LikertScaleResponseDao).selectedValue > 5) {
                throw new Error('Rating must be between 1 and 5 for question');
            }
            (response as LikertScaleResponse).rating = (responsePayload as LikertScaleResponseDao).selectedValue;
            attempt.save();
            break;
        default:
            throw new Error('Unsupported question type');
    }
}