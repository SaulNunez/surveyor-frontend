import { NotFoundError } from "../models/Errors/notFoundError";
import { db } from "../db";
import { surveys, questions, responses, attempts } from "../db/schema";
import { eq, and, isNotNull, count } from "drizzle-orm";
import { SurveySummaryDao } from "../models/frontend/survey";

export async function getAllSurveysForUser(userId: string) {
    const results = await db.select().from(surveys).where(eq(surveys.userId, userId));

    return results.map(survey => ({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt
    }));
}

export async function getSurvey(surveyId: string) {
    const results = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Survey not found');
    }

    const survey = results[0];
    return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt
    };
}

export async function createSurvey(title: string, description: string, userId: string) {
    const results = await db.insert(surveys).values({
        title,
        description,
        userId
    }).returning();

    const survey = results[0];
    return {
        id: survey.id,
        title: survey.title,
        description: survey.description
    };
}

export async function editSurvey(surveyId: string, userId: string, title: string, description: string) {
    const results = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Survey not found');
    }

    const survey = results[0];

    if (survey.userId !== userId) {
        throw new NotFoundError('Survey not found');
    }

    const updated = await db.update(surveys)
        .set({ title, description })
        .where(eq(surveys.id, surveyId))
        .returning();

    const updatedSurvey = updated[0];
    return {
        id: updatedSurvey.id,
        title: updatedSurvey.title,
        description: updatedSurvey.description
    };
}

export async function deleteSurvey(surveyId: string, userId: string) {
    const results = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Survey not found');
    }

    const survey = results[0];

    if (survey.userId !== userId) {
        throw new NotFoundError('Survey not found');
    }

    await db.delete(surveys).where(eq(surveys.id, surveyId));
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

export async function getSurveySummary(surveyId: string): Promise<SurveySummaryDao> {
    const surveyResults = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);

    if (surveyResults.length === 0) {
        throw new NotFoundError("Survey not found");
    }

    const survey = surveyResults[0];

    const questionResults = await db.select()
        .from(questions)
        .where(eq(questions.surveyId, surveyId));

    const questionsSummaries: any[] = [];

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
                    isNotNull(responses.response)
                )
            );

            const summary = openEndedResponses
                .map(r => r.response)
                .filter(Boolean)
                .join(", ");

            questionsSummaries.push({
                id: question.id,
                title: question.text,
                questionType: "open-ended",
                summary
            });
        }
    }

    return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: questionsSummaries
    };
}