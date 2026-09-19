import { QuestionDao, QuestionInput } from "./question";

export interface SurveyInput {
    title: string,
    description: string,
    /**
     * Whether people without an account may answer. This gates *answering*
     * only — a survey's questions are readable by anyone holding its public id
     * either way.
     */
    openToAnyone: boolean,
    questions: QuestionInput[]
}

export interface SurveyDao {
    /** The survey's six-character public id — what the URL carries. */
    id: string,
    title: string,
    description: string,
    /**
     * Whether people without an account may answer. This gates *answering*
     * only — a survey's questions are readable by anyone holding its public id
     * either way.
     */
    openToAnyone: boolean,
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

/**
 * An AI-generated summary of an open-ended question's answers, carrying the
 * provenance needed to judge how much to trust it: which provider and model
 * produced it, over how many answers, and when. A `responseCount` below the
 * number of answers now on screen means the summary predates some of them.
 */
export interface OpenEndedAiSummary {
    text: string,
    provider: string,
    model: string,
    responseCount: number,
    generatedAt: string,
}

export interface OpenEndedSummary {
    id: string,
    title: string,
    questionType: 'open-ended',
    responses: string[],
    aiSummary: OpenEndedAiSummary | null,
}

export type QuestionSummary = MultipleOptionsSummary | BinaryOptionsSummary | LikertScaleSummary | OpenEndedSummary;

/** Whether this deployment can generate AI summaries at all. */
export interface AiSummaryAvailability {
    available: boolean,
    provider: string | null,
}

export interface SurveySummaryDao {
    /** The survey's six-character public id — what the URL carries. */
    id: string,
    title: string,
    description: string
    /** Whether people without an account may answer. The author can change it. */
    openToAnyone: boolean,
    questions: QuestionSummary[],
    aiSummaries: AiSummaryAvailability,
}