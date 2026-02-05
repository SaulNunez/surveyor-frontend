import { OpenEndedResult, MultipleChoiceResult, BinaryChoiceResult, LikertScaleResult } from "./resultSchema";

export enum QuestionType {
    OPEN_ENDED = 'open-ended',
    MULTIPLE_CHOICE = 'multiple-choice',
    BINARY_CHOICE = 'binary-choice',
    LIKERT_SCALE = 'likert-scale'
}
export interface QuestionBase {
    text: string,
}
export interface OpenEndedQuestion extends QuestionBase {
    questionType: QuestionType.OPEN_ENDED,
    results: OpenEndedResult | undefined
}

export interface MultipleChoiceQuestion extends QuestionBase {
    options: string[],
    questionType: QuestionType.MULTIPLE_CHOICE,
    results: MultipleChoiceResult | undefined
}

export interface BinaryChoiceQuestion extends QuestionBase {
    positiveLabel: string,
    negativeLabel: string,
    questionType: QuestionType.BINARY_CHOICE,
    results: BinaryChoiceResult | undefined
}

export interface LikertScaleQuestion extends QuestionBase {
    positiveLabel: string,
    negativeLabel: string,
    questionType: QuestionType.LIKERT_SCALE,
    results: LikertScaleResult | undefined
}

export type Question = OpenEndedQuestion | MultipleChoiceQuestion | BinaryChoiceQuestion | LikertScaleQuestion;