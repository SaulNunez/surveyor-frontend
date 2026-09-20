import { NotFoundError } from "../models/Errors/notFoundError";
import { db } from "../db";
import { surveys, questions, questionSummaries, responses } from "../db/schema";
import { generateSurveyPublicId } from "../db/publicId";
import { eq, and, isNotNull, ne, count, sql } from "drizzle-orm";
import { QuestionSummary, SurveySummaryDao } from "../models/frontend/survey";
import { Executor } from "../db/executor";
import { isUniqueViolation } from "../db/errors";
import { resolveAiProviderConfig } from "./ai";

/**
 * Load a survey the given user owns, by its public id, or throw. A survey
 * belonging to someone else is reported as missing rather than forbidden, so
 * the API does not leak which survey ids exist.
 */
export async function assertSurveyOwnedBy(surveyPublicId: string, userId: string, executor: Executor = db) {
    const results = await executor.select().from(surveys).where(eq(surveys.publicId, surveyPublicId)).limit(1);

    if (results.length === 0 || results[0].userId !== userId) {
        throw new NotFoundError('Survey not found');
    }

    return results[0];
}

// Six base64url characters leave room for collisions, so a create that loses
// the race for a code tries again with a fresh one. Ten attempts is far more
// than a table of this size will ever need.
const PUBLIC_ID_ATTEMPTS = 10;

/**
 * Translates the six-character public id that appears in URLs into the uuid
 * rows are keyed by.
 *
 * Services that only need to read the survey itself filter on `publicId`
 * directly; this is for the ones that need the internal id to reach related
 * rows (questions, attempts).
 */
export async function resolveSurveyId(publicId: string, executor: Executor = db) {
    const results = await executor.select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.publicId, publicId))
        .limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Survey not found');
    }

    return results[0].id;
}

/**
 * Whether this survey accepts answers from guest accounts.
 *
 * Kept separate from `resolveSurveyId` rather than widening it: that function
 * hands a bare uuid to `questionService`, `attemptService` and
 * `responseService`, none of which care about who may answer.
 */
export async function isSurveyOpenToAnyone(surveyPublicId: string, executor: Executor = db): Promise<boolean> {
    const results = await executor.select({ openToAnyone: surveys.openToAnyone })
        .from(surveys)
        .where(eq(surveys.publicId, surveyPublicId))
        .limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Survey not found');
    }

    return results[0].openToAnyone;
}

export async function getAllSurveysForUser(userId: string) {
    const results = await db.select().from(surveys).where(eq(surveys.userId, userId));

    return results.map(survey => ({
        id: survey.publicId,
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt,
        openToAnyone: survey.openToAnyone
    }));
}

export async function getSurvey(surveyPublicId: string) {
    const results = await db.select().from(surveys).where(eq(surveys.publicId, surveyPublicId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Survey not found');
    }

    const survey = results[0];
    return {
        id: survey.publicId,
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt,
        openToAnyone: survey.openToAnyone
    };
}

/**
 * Note the missing `executor`: the retry below catches a unique violation and
 * inserts again, which a transaction cannot survive — Postgres aborts the
 * whole transaction on the first one. This has to run on its own connection.
 */
export async function createSurvey(title: string, description: string, userId: string, openToAnyone = false) {
    for (let attempt = 0; attempt < PUBLIC_ID_ATTEMPTS; attempt++) {
        try {
            const results = await db.insert(surveys).values({
                publicId: generateSurveyPublicId(),
                title,
                description,
                userId,
                openToAnyone
            }).returning();

            const survey = results[0];
            return {
                id: survey.publicId,
                title: survey.title,
                description: survey.description,
                openToAnyone: survey.openToAnyone
            };
        } catch (error) {
            // Another survey already holds this code. Nothing about the row is
            // wrong, so draw a new code and insert again.
            if (!isPublicIdCollision(error)) {
                throw error;
            }
        }
    }

    throw new Error('Could not allocate a public id for this survey');
}

// `createSurvey` retries on this rather than check-then-insert, the same way
// attempts are created.
function isPublicIdCollision(error: unknown) {
    return isUniqueViolation(error, 'public_id');
}

export async function editSurvey(
    surveyPublicId: string,
    userId: string,
    title: string,
    description: string,
    openToAnyone: boolean,
    executor: Executor = db
) {
    const survey = await assertSurveyOwnedBy(surveyPublicId, userId, executor);

    const updated = await executor.update(surveys)
        .set({ title, description, openToAnyone })
        .where(eq(surveys.id, survey.id))
        .returning();

    const updatedSurvey = updated[0];
    return {
        id: updatedSurvey.publicId,
        title: updatedSurvey.title,
        description: updatedSurvey.description,
        openToAnyone: updatedSurvey.openToAnyone
    };
}

export async function deleteSurvey(surveyPublicId: string, userId: string) {
    const survey = await assertSurveyOwnedBy(surveyPublicId, userId);

    await db.delete(surveys).where(eq(surveys.id, survey.id));
    return true;
}

export async function getOptionSelectionCountForQuestion(questionId: string) {
    const questionResults = await db.select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

    if (questionResults.length === 0) {
        throw new NotFoundError('Question not found');
    }

    const question = questionResults[0];
    if (question.questionType !== 'multiple-choice') {
        throw new Error('Question is not a multiple-choice question');
    }

    const results = await db.select({
        selectedOption: responses.selectedOption,
        count: count(),
    })
    .from(responses)
    .where(
        and(
            eq(responses.questionId, questionId),
            isNotNull(responses.selectedOption)
        )
    )
    .groupBy(responses.selectedOption);

    const options = question.options || [];
    const countMap: Record<number, { optionIndex: number, optionText: string, count: number }> = {};

    options.forEach((optionText, index) => {
        countMap[index] = {
            optionIndex: index,
            optionText: optionText,
            count: 0
        };
    });

    for (const row of results) {
        const option = row.selectedOption!;
        
        if (countMap[option] !== undefined) {
            countMap[option].count = row.count;
        } else {
            countMap[option] = {
                optionIndex: option,
                optionText: options[option] || `Option ${option}`,
                count: row.count
            };
        }
    }

    return Object.values(countMap);
}

export async function getLikertScaleRatingCountForQuestion(questionId: string) {
    const questionResults = await db.select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

    if (questionResults.length === 0) {
        throw new NotFoundError('Question not found');
    }

    const question = questionResults[0];
    if (question.questionType !== 'likert-scale') {
        throw new Error('Question is not a likert-scale question');
    }

    const results = await db.select({
        rating: responses.rating,
        count: count(),
    })
    .from(responses)
    .where(
        and(
            eq(responses.questionId, questionId),
            isNotNull(responses.rating)
        )
    )
    .groupBy(responses.rating);

    const countMap: Record<number, { rating: number, count: number }> = {};

    for (let r = 1; r <= 5; r++) {
        countMap[r] = {
            rating: r,
            count: 0
        };
    }

    for (const row of results) {
        const rating = row.rating!;
        if (countMap[rating] !== undefined) {
            countMap[rating].count = row.count;
        } else {
            countMap[rating] = {
                rating: rating,
                count: row.count
            };
        }
    }

    return Object.values(countMap);
}

export async function getBinaryChoiceCountForQuestion(questionId: string) {
    const questionResults = await db.select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

    if (questionResults.length === 0) {
        throw new NotFoundError('Question not found');
    }

    const question = questionResults[0];
    if (question.questionType !== 'binary-choice') {
        throw new Error('Question is not a binary-choice question');
    }

    const results = await db.select({
        choice: responses.choice,
        count: count(),
    })
    .from(responses)
    .where(
        and(
            eq(responses.questionId, questionId),
            isNotNull(responses.choice)
        )
    )
    .groupBy(responses.choice);

    const positiveLabel = question.positiveLabel || 'Yes';
    const negativeLabel = question.negativeLabel || 'No';

    const countMap = {
        positive: { choice: 'positive', label: positiveLabel, count: 0 },
        negative: { choice: 'negative', label: negativeLabel, count: 0 },
    };

    for (const row of results) {
        const isPositive = row.choice!;
        if (isPositive) {
            countMap.positive.count = row.count;
        } else {
            countMap.negative.count = row.count;
        }
    }

    return Object.values(countMap);
}

export async function getSurveySummary(surveyPublicId: string): Promise<SurveySummaryDao> {
    const surveyResults = await db.select().from(surveys).where(eq(surveys.publicId, surveyPublicId)).limit(1);

    if (surveyResults.length === 0) {
        throw new NotFoundError("Survey not found");
    }

    const survey = surveyResults[0];

    const questionResults = await db.select()
        .from(questions)
        .where(eq(questions.surveyId, survey.id));

    // One lookup for every stored AI summary in the survey, rather than a
    // query per open-ended question.
    const storedSummaries = await db.select()
        .from(questionSummaries)
        .innerJoin(questions, eq(questionSummaries.questionId, questions.id))
        .where(eq(questions.surveyId, survey.id));

    const summaryByQuestionId = new Map(
        storedSummaries.map(row => [row.question_summaries.questionId, row.question_summaries])
    );

    const questionsSummaries: QuestionSummary[] = [];

    for (const question of questionResults) {
        if (question.questionType === "multiple-choice") {
            const options = question.options || [];
            const responseCounts = await db.select({
                selectedOption: responses.selectedOption,
                count: count(),
            })
            .from(responses)
            .where(
                and(
                    eq(responses.questionId, question.id),
                    isNotNull(responses.selectedOption)
                )
            )
            .groupBy(responses.selectedOption);

            const countMap = new Map<number, number>();
            for (const row of responseCounts) {
                if (row.selectedOption !== null) {
                    countMap.set(row.selectedOption, row.count);
                }
            }

            const result = options.map((optionText, index) => ({
                option: optionText,
                count: countMap.get(index) || 0
            }));

            questionsSummaries.push({
                id: question.id,
                title: question.text,
                questionType: "multiple-choice",
                result: result as [{ option: string; count: number; }]
            });
        } else if (question.questionType === "binary-choice") {
            const responseCounts = await db.select({
                choice: responses.choice,
                count: count(),
            })
            .from(responses)
            .where(
                and(
                    eq(responses.questionId, question.id),
                    isNotNull(responses.choice)
                )
            )
            .groupBy(responses.choice);

            let yesCount = 0;
            let noCount = 0;
            for (const row of responseCounts) {
                if (row.choice === true) {
                    yesCount = row.count;
                } else if (row.choice === false) {
                    noCount = row.count;
                }
            }

            questionsSummaries.push({
                id: question.id,
                title: question.text,
                questionType: "binary-choice",
                yesCount,
                noCount
            });
        } else if (question.questionType === "likert-scale") {
            const responseCounts = await db.select({
                rating: responses.rating,
                count: count(),
            })
            .from(responses)
            .where(
                and(
                    eq(responses.questionId, question.id),
                    isNotNull(responses.rating)
                )
            )
            .groupBy(responses.rating);

            const countMap = new Map<number, number>();
            for (const row of responseCounts) {
                if (row.rating !== null) {
                    countMap.set(row.rating, row.count);
                }
            }

            const result = [1, 2, 3, 4, 5].map(rating => ({
                options: rating,
                count: countMap.get(rating) || 0
            }));

            questionsSummaries.push({
                id: question.id,
                title: question.text,
                questionType: "likert-scale",
                result: result as [{ options: number; count: number; }]
            });
        } else if (question.questionType === "open-ended") {
            const openEndedResponses = await db.select({
                response: responses.response
            })
            .from(responses)
            .where(
                and(
                    eq(responses.questionId, question.id),
                    isNotNull(responses.response),
                    ne(sql`btrim(${responses.response})`, '')
                )
            );

            const stored = summaryByQuestionId.get(question.id);

            questionsSummaries.push({
                id: question.id,
                title: question.text,
                questionType: "open-ended",
                responses: openEndedResponses.map(r => r.response!.trim()),
                aiSummary: stored
                    ? {
                        text: stored.summary,
                        provider: stored.provider,
                        model: stored.model,
                        responseCount: stored.responseCount,
                        generatedAt: stored.generatedAt.toISOString(),
                    }
                    : null,
            });
        }
    }

    // Resolution can throw when AI_SUMMARY_PROVIDER names a provider whose
    // credentials are missing. That is a server misconfiguration, not a reason
    // to fail reading results — report the feature as unavailable instead.
    let aiProvider: string | null = null;
    try {
        aiProvider = resolveAiProviderConfig()?.provider ?? null;
    } catch (reason) {
        console.error('AI provider is misconfigured; summaries disabled:', reason);
    }

    return {
        id: survey.publicId,
        title: survey.title,
        description: survey.description,
        openToAnyone: survey.openToAnyone,
        questions: questionsSummaries,
        aiSummaries: {
            available: aiProvider !== null,
            provider: aiProvider,
        },
    };
}