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

export interface MultipleOptionsSummary {
    id: string,
    title: string,
    questionType: 'multiple-choice',
    result: [
        {
            option: string,
            count: number
        }
    ]
}

export interface BinaryOptionsSummary {
    id: string,
    title: string,
    questionType: 'binary-choice',
    yesCount: number,
    noCount: number
}

export interface LikertScaleSummary {
    id: string,
    title: string,
    questionType: 'likert-scale',
    result: [
        {
            options: number,
            count: number
        }
    ]
}

export interface OpenEndedSummary {
    id: string,
    title: string,
    questionType: 'open-ended',
    summary: string,
}

type QuestionSummary = MultipleOptionsSummary | BinaryOptionsSummary | LikertScaleSummary | OpenEndedSummary;

export interface SurveySummaryDao {
    id: string,
    title: string,
    description: string
    questions: QuestionSummary[]
}