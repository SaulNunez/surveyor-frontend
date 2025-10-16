import { QuestionDao } from "./question";

export interface SurveyInput {
    title: string,
    description: string,
    questions: QuestionDao[]
}