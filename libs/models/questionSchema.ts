import { OpenEndedResult, MultipleChoiceResult, BinaryChoiceResult, LikertScaleResult } from "./resultSchema";

export enum QuestionType {
    OPEN_ENDED = 'open-ended',
    MULTIPLE_CHOICE = 'multiple-choice',
    BINARY_CHOICE = 'binary-choice',
    LIKERT_SCALE = 'likert-scale'
}
import { ObjectId } from "mongodb";

export interface QuestionBase {
    _id?: ObjectId,
    text: string,
    questionType: QuestionType
}
export interface OpenEndedQuestion extends QuestionBase {
    questionType: QuestionType.OPEN_ENDED,
    results?: OpenEndedResult
}

export interface MultipleChoiceQuestion extends QuestionBase {
    options: string[],
    questionType: QuestionType.MULTIPLE_CHOICE,
    results?: MultipleChoiceResult
}

export interface BinaryChoiceQuestion extends QuestionBase {
    positiveLabel: string,
    negativeLabel: string,
    questionType: QuestionType.BINARY_CHOICE,
    results?: BinaryChoiceResult
}

export interface LikertScaleQuestion extends QuestionBase {
    positiveLabel: string,
    negativeLabel: string,
    options: string[],
    questionType: QuestionType.LIKERT_SCALE,
    results?: LikertScaleResult
}

export type Question = OpenEndedQuestion | MultipleChoiceQuestion | BinaryChoiceQuestion | LikertScaleQuestion;