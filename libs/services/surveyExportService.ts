import { db } from "../db";
import { Executor } from "../db/executor";
import { surveys, questions, attempts, responses } from "../db/schema";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { NotFoundError } from "../models/Errors/notFoundError";
import { QuestionDao } from "../models/frontend/question";

type QuestionRow = typeof questions.$inferSelect;
type ResponseRow = typeof responses.$inferSelect;
type QuestionType = QuestionDao['questionType'];

export type ExportAnswer = string | number;

export interface ExportSummaryRow {
    label: string | number,
    count: number,
}

export interface ExportQuestion {
    id: string,
    text: string,
    questionType: QuestionType,
    /** Per-option counts; empty for open-ended questions. */
    rows: ExportSummaryRow[],
    /** How many completed attempts answered this question. */
    answered: number,
    /** Mean rating, for likert-scale questions that received any answer. */
    average: number | null,
}

export interface ExportAttempt {
    attemptId: string,
    startedAt: Date,
    completedAt: Date,
    answers: Record<string, ExportAnswer>,
}

export interface SurveyExportData {
    survey: { id: string, title: string, description: string },
    questions: ExportQuestion[],
    attempts: ExportAttempt[],
}

const LIKERT_RATINGS = [1, 2, 3, 4, 5];

function binaryLabels(question: QuestionRow) {
    return {
        positive: question.positiveLabel || 'Yes',
        negative: question.negativeLabel || 'No',
    };
}

function optionLabel(question: QuestionRow, index: number) {
    return question.options?.[index] ?? `Option ${index + 1}`;
}

/**
 * The value shown in a spreadsheet cell for a response, or null when the row
 * holds no value for its question's type.
 */
function toDisplayValue(question: QuestionRow, response: ResponseRow): ExportAnswer | null {
    const questionType = question.questionType as QuestionType;
    switch (questionType) {
        case 'open-ended':
            return response.response;
        case 'multiple-choice':
            return response.selectedOption === null ? null : optionLabel(question, response.selectedOption);
        case 'binary-choice': {
            if (response.choice === null) return null;
            const labels = binaryLabels(question);
            return response.choice ? labels.positive : labels.negative;
        }
        case 'likert-scale':
            return response.rating;
        default: {
            const unsupported: never = questionType;
            throw new Error(`Unsupported question type: ${unsupported}`);
        }
    }
}

function summarize(question: QuestionRow, answers: ExportAnswer[]): ExportQuestion {
    const questionType = question.questionType as QuestionType;
    const countOf = (value: ExportAnswer) => answers.filter(answer => answer === value).length;

    let labels: (string | number)[] = [];
    if (questionType === 'multiple-choice') {
        labels = [...(question.options ?? [])];
        // Answers pointing at an option that has since been removed still count.
        for (const answer of answers) {
            if (!labels.includes(answer)) labels.push(answer);
        }
    } else if (questionType === 'binary-choice') {
        const { positive, negative } = binaryLabels(question);
        labels = [positive, negative];
    } else if (questionType === 'likert-scale') {
        labels = LIKERT_RATINGS;
    }

    const ratings = questionType === 'likert-scale' ? answers.filter(a => typeof a === 'number') : [];
    const average = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null;

    return {
        id: question.id,
        text: question.text,
        questionType,
        rows: labels.map(label => ({ label, count: countOf(label) })),
        answered: answers.length,
        average,
    };
}

/**
 * Everything needed to export a survey's results, drawn from completed
 * attempts only: an in-progress attempt may still change or be discarded by a
 * restart. Only the survey's owner may export it; anyone else gets
 * `NotFoundError` so the API does not leak the survey's existence.
 */
export async function getSurveyExportData(
    surveyId: string,
    userId: string,
    executor: Executor = db
): Promise<SurveyExportData> {
    const surveyResults = await executor.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
    const survey = surveyResults[0];
    if (!survey || survey.userId !== userId) {
        throw new NotFoundError('Survey not found');
    }

    const questionRows = await executor.select().from(questions).where(eq(questions.surveyId, surveyId));

    const completed = and(eq(attempts.surveyId, surveyId), isNotNull(attempts.completedAt));

    const attemptRows = await executor.select()
        .from(attempts)
        .where(completed)
        .orderBy(asc(attempts.completedAt));

    const responseRows = await executor.select({ response: responses })
        .from(responses)
        .innerJoin(attempts, eq(responses.attemptId, attempts.id))
        .where(completed);

    const questionsById = new Map(questionRows.map(question => [question.id, question]));
    const answersByAttempt = new Map<string, Record<string, ExportAnswer>>();
    const answersByQuestion = new Map<string, ExportAnswer[]>();

    for (const { response } of responseRows) {
        const question = questionsById.get(response.questionId);
        if (!question) continue;

        const value = toDisplayValue(question, response);
        if (value === null) continue;

        const attemptAnswers = answersByAttempt.get(response.attemptId) ?? {};
        attemptAnswers[question.id] = value;
        answersByAttempt.set(response.attemptId, attemptAnswers);

        const questionAnswers = answersByQuestion.get(question.id) ?? [];
        questionAnswers.push(value);
        answersByQuestion.set(question.id, questionAnswers);
    }

    return {
        survey: { id: survey.id, title: survey.title, description: survey.description },
        questions: questionRows.map(question => summarize(question, answersByQuestion.get(question.id) ?? [])),
        attempts: attemptRows.map(attempt => ({
            attemptId: attempt.id,
            startedAt: attempt.startedAt,
            completedAt: attempt.completedAt!,
            answers: answersByAttempt.get(attempt.id) ?? {},
        })),
    };
}
