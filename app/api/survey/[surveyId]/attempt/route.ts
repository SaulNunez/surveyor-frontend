import { auth } from "@/auth";
import { getExistingAttempt, deleteExistingAttempt, createNewAttempt, completeExistingAttempt } from "@/libs/services/attemptService";
import { getQuestionsForSurvey } from "@/libs/services/questionService";
import { addResponseToQuestion, updateResponseToQuestion } from "@/libs/services/responseService";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";
import { db } from "@/libs/db";
import { responses, attempts } from "@/libs/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return new Response(JSON.stringify({ attempt: null }), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    try {
        const { surveyId } = await params;
        const attempt = await getExistingAttempt(surveyId, session.user.id);
        if (!attempt) {
            return new Response(JSON.stringify({ attempt: null }), { 
                status: 200, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Get responses for this attempt
        const attemptResponses = await db.select().from(responses).where(eq(responses.attemptId, attempt.id));
        const questionsSurvey = await getQuestionsForSurvey(surveyId);

        const responsesMap: Record<string, any> = {};
        for (const r of attemptResponses) {
            if (r.responseType === 'open-ended') {
                responsesMap[r.questionId] = r.response;
            } else if (r.responseType === 'multiple-choice') {
                const q = questionsSurvey.find(q => q.id === r.questionId);
                if (q && q.options && r.selectedOption !== null && r.selectedOption !== undefined) {
                    responsesMap[r.questionId] = q.options[r.selectedOption];
                }
            } else if (r.responseType === 'binary-choice') {
                responsesMap[r.questionId] = r.choice ? 'positive' : 'negative';
            } else if (r.responseType === 'likert-scale') {
                responsesMap[r.questionId] = r.rating;
            }
        }

        return new Response(JSON.stringify({ attempt, responses: responsesMap }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return new Response(JSON.stringify({ attempt: null }), { 
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
        const message = error instanceof Error ? error.message : 'Unexpected exception';
        return new Response(message, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const { surveyId } = await params;
        const attempt = await getExistingAttempt(surveyId, session.user.id);
        if (!attempt) {
            return new Response("No active attempt found", { status: 404 });
        }

        await deleteExistingAttempt(attempt.id, session.user.id);
        return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return new Response("Attempt not found", { status: 404 });
        }
        const message = error instanceof Error ? error.message : "Unexpected error";
        return new Response(message, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const { surveyId } = await params;
        const body = await request.json();

        // Get or create attempt
        let attempt = null;
        try {
            attempt = await getExistingAttempt(surveyId, session.user.id);
        } catch (error) {
            if (!(error instanceof NotFoundError)) {
                throw error;
            }
        }

        if (!attempt) {
            try {
                attempt = await createNewAttempt(surveyId, session.user.id);
            } catch (error) {
                if (error instanceof NotFoundError) {
                    const results = await db.insert(attempts).values({
                        surveyId: surveyId,
                        userId: session.user.id,
                        startedAt: new Date()
                    }).returning();
                    attempt = {
                        id: results[0].id,
                        survey: results[0].surveyId,
                        startedAt: results[0].startedAt
                    };
                } else {
                    throw error;
                }
            }
        }

        const questionsSurvey = await getQuestionsForSurvey(surveyId);

        // Save responses
        for (const [questionId, value] of Object.entries(body)) {
            const question = questionsSurvey.find(q => q.id === questionId);
            if (!question) continue;

            let responsePayload: any = {
                questionId,
                questionType: question.questionType
            };

            if (question.questionType === 'open-ended') {
                responsePayload.response = String(value);
            } else if (question.questionType === 'multiple-choice') {
                if (question.options) {
                    const idx = question.options.indexOf(value as string);
                    if (idx !== -1) {
                        responsePayload.selectedOptionIndex = idx;
                    } else {
                        continue;
                    }
                } else {
                    continue;
                }
            } else if (question.questionType === 'binary-choice') {
                responsePayload.selectedOption = value;
            } else if (question.questionType === 'likert-scale') {
                responsePayload.selectedValue = Number(value);
            } else {
                continue;
            }

            const existing = await db.select()
                .from(responses)
                .where(and(eq(responses.attemptId, attempt.id), eq(responses.questionId, questionId)))
                .limit(1);

            if (existing.length > 0) {
                await updateResponseToQuestion(attempt.id, questionId, responsePayload);
            } else {
                await addResponseToQuestion(attempt.id, questionId, responsePayload);
            }
        }

        return new Response(JSON.stringify({ success: true, attemptId: attempt.id }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return new Response(message, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const { surveyId } = await params;
        const attempt = await getExistingAttempt(surveyId, session.user.id);
        if (!attempt) {
            return new Response("No active attempt found to submit.", { status: 404 });
        }

        const questionsSurvey = await getQuestionsForSurvey(surveyId);
        const attemptResponses = await db.select().from(responses).where(eq(responses.attemptId, attempt.id));

        if (attemptResponses.length < questionsSurvey.length) {
            return new Response("Please answer all questions before submitting.", { status: 400 });
        }

        const completedAttempt = await completeExistingAttempt(attempt.id, session.user.id);

        return new Response(JSON.stringify({ success: true, attempt: completedAttempt }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return new Response("Attempt not found", { status: 404 });
        }
        const message = error instanceof Error ? error.message : "Unexpected error";
        return new Response(message, { status: 500 });
    }
}
