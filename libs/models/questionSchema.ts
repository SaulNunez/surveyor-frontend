export enum QuestionType {
    OPEN_ENDED = 'open-ended',
    MULTIPLE_CHOICE = 'multiple-choice',
    BINARY_CHOICE = 'binary-choice',
    LIKERT_SCALE = 'likert-scale'
}
interface QuestionBase {
    text: string,
}
export interface OpenEndedQuestion extends QuestionBase {
    questionType: QuestionType.OPEN_ENDED
}

export interface MultipleChoiceQuestion extends QuestionBase {
    options: string[],
    questionType: QuestionType.MULTIPLE_CHOICE
}

export interface BinaryChoiceQuestion extends QuestionBase {
    positiveLabel: string,
    negativeLabel: string
    questionType: QuestionType.BINARY_CHOICE
}

export interface LikertScaleQuestion extends QuestionBase {
    positiveLabel: string,
    negativeLabel: string,
    questionType: QuestionType.LIKERT_SCALE
}

export type Question = OpenEndedQuestion | MultipleChoiceQuestion | BinaryChoiceQuestion | LikertScaleQuestion;