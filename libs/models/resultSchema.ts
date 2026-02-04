import { QuestionType } from "./questionSchema"

export interface QuestionBase {
    questionId: string
}
export interface OpenEndedQuestion extends QuestionBase {
    questionType: QuestionType.OPEN_ENDED
    representativeQuotes: string[],
    totalResponses: number,
    thematicTags: string[]
}

export interface MultipleChoiceQuestion extends QuestionBase {
    selectionSum: number[],
    questionType: QuestionType.MULTIPLE_CHOICE
}

export interface BinaryChoiceQuestion extends QuestionBase {
    positiveSelectionSum: number,
    negativeSelectionSum: number,
    questionType: QuestionType.BINARY_CHOICE
}

export interface LikertScaleQuestion extends QuestionBase {
    selectionSum: number[],
    questionType: QuestionType.LIKERT_SCALE
}