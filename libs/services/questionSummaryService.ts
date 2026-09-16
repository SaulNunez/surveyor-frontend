import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { Executor } from "../db/executor";
import { questionSummaries, questions, responses, surveys } from "../db/schema";
import { InvalidOperationError } from "../models/Errors/invalidOperationError";
import { NotFoundError } from "../models/Errors/notFoundError";
import { SummaryProvider, resolveSummaryProvider } from "./ai";
import { capResponses } from "./ai/prompt";

export interface StoredQuestionSummary {
    questionId: string;
    summary: string;
    provider: string;
    model: string;
    responseCount: number;
    generatedAt: Date;
}

export async function getSummaryForQuestion(
    questionId: string,
    executor: Executor = db
): Promise<StoredQuestionSummary | null> {
    const results = await executor.select()
        .from(questionSummaries)
        .where(eq(questionSummaries.questionId, questionId))
        .limit(1);

    if (results.length === 0) {
        return null;
    }

    const row = results[0];
    return {
        questionId: row.questionId,
        summary: row.summary,
        provider: row.provider,
        model: row.model,
        responseCount: row.responseCount,
        generatedAt: row.generatedAt,
    };
}

/**
 * Every non-blank answer to an open-ended question, across all attempts.
 */
export async function getOpenEndedResponses(
    questionId: string,
    executor: Executor = db
): Promise<string[]> {
    const rows = await executor.select({ response: responses.response })
        .from(responses)
        .where(
            and(
                eq(responses.questionId, questionId),
                isNotNull(responses.response),
                ne(sql`btrim(${responses.response})`, '')
            )
        );

    return rows.map(row => row.response!.trim());
}

/**
 * Generate (or regenerate) the summary of an open-ended question's answers and
 * persist it.
 *
 * `provider` is injectable so tests can run the whole path against the real
 * database without reaching a provider; it defaults to whatever the
 * environment is configured for.
 */
export async function generateSummaryForQuestion(
    surveyPublicId: string,
    questionId: string,
    userId: string,
    provider?: SummaryProvider,
    executor: Executor = db
): Promise<StoredQuestionSummary> {
    const questionRows = await executor.select({
        id: questions.id,
        text: questions.text,
        questionType: questions.questionType,
        ownerId: surveys.userId,
    })
        .from(questions)
        .innerJoin(surveys, eq(questions.surveyId, surveys.id))
        .where(and(eq(questions.id, questionId), eq(surveys.publicId, surveyPublicId)))
        .limit(1);

    // A question on someone else's survey — or one that does not belong to the
    // survey named in the URL — is reported as missing rather than forbidden,
    // so the API does not leak which question ids exist.
    if (questionRows.length === 0 || questionRows[0].ownerId !== userId) {
        throw new NotFoundError('Question not found');
    }

    const question = questionRows[0];
    if (question.questionType !== 'open-ended') {
        throw new InvalidOperationError('Only open-ended questions can be summarized');
    }

    const allResponses = await getOpenEndedResponses(questionId, executor);
    // Checked before the provider is resolved: an empty question should not
    // report a configuration problem, and should never spend tokens.
    if (allResponses.length === 0) {
        throw new InvalidOperationError('There are no responses to summarize yet');
    }

    const summaryProvider = provider ?? resolveSummaryProvider();
    if (!summaryProvider) {
        throw new InvalidOperationError(
            'No AI provider is configured on this server. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_BASE_URL.'
        );
    }

    const { kept, total } = capResponses(allResponses);
    const summary = await summaryProvider.summarize(question.text, kept, total);

    // Upsert on the unique index: two owners hitting Regenerate at once
    // collapse into one row rather than racing to insert.
    const [row] = await executor.insert(questionSummaries)
        .values({
            questionId,
            summary,
            provider: summaryProvider.name,
            model: summaryProvider.model,
            responseCount: total,
        })
        .onConflictDoUpdate({
            target: questionSummaries.questionId,
            set: {
                summary,
                provider: summaryProvider.name,
                model: summaryProvider.model,
                responseCount: total,
                generatedAt: new Date(),
            },
        })
        .returning();

    return {
        questionId: row.questionId,
        summary: row.summary,
        provider: row.provider,
        model: row.model,
        responseCount: row.responseCount,
        generatedAt: row.generatedAt,
    };
}
