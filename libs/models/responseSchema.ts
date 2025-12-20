import { QuestionBase, QuestionType } from "./questionSchema";

export interface Response {
    question: string;
    responseType: string;
}

export interface OpenEndedResponse extends Response {
    response: string,
    responseType: QuestionType.OPEN_ENDED
}
export interface MultipleChoiceResponse extends Response {
   selectedOption: number,
   responseType: QuestionType.MULTIPLE_CHOICE
}
export interface BinaryChoiceResponse extends Response {
    choice: boolean,
    responseType: QuestionType.BINARY_CHOICE
}
export interface LikertScaleResponse extends Response {
    rating: number,
    responseType: QuestionType.LIKERT_SCALE
}