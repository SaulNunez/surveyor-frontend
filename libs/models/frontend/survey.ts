import { QuestionDao, QuestionInput } from "./question";

export interface SurveyInput {
    title: string,
    description: string,
    questions: QuestionInput[]
}

export interface SurveyDao {
    id: string,
    title: string,
    description: string,
    questions: QuestionDao[]
}