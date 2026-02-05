import { QuestionBase, QuestionType } from "./questionSchema"

export interface ResultBase {
    questionId: string
}
export interface OpenEndedResult extends ResultBase {
    questionType: QuestionType.OPEN_ENDED
    representativeQuotes: string[],
    totalResponses: number,
    thematicTags: string[]
}

export interface MultipleChoiceResult extends ResultBase {
    selectionSum: number[],
    questionType: QuestionType.MULTIPLE_CHOICE
}

export interface BinaryChoiceResult extends ResultBase {
    positiveSelectionSum: number,
    negativeSelectionSum: number,
    questionType: QuestionType.BINARY_CHOICE
}

export interface LikertScaleResult extends ResultBase {
    selectionSum: number[],
    questionType: QuestionType.LIKERT_SCALE
}