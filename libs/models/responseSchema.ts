import { QuestionBase, QuestionType } from "./questionSchema";

export interface BaseResponse {
    question: string;
    responseType: string;
}

export interface OpenEndedResponse extends BaseResponse {
    response: string,
    responseType: QuestionType.OPEN_ENDED
}
export interface MultipleChoiceResponse extends BaseResponse {
   selectedOption: number,
   responseType: QuestionType.MULTIPLE_CHOICE
}
export interface BinaryChoiceResponse extends BaseResponse {
    choice: boolean,
    responseType: QuestionType.BINARY_CHOICE
}
export interface LikertScaleResponse extends BaseResponse {
    rating: number,
    responseType: QuestionType.LIKERT_SCALE
}

export type Response = OpenEndedResponse | MultipleChoiceResponse | BinaryChoiceResponse | LikertScaleResponse;