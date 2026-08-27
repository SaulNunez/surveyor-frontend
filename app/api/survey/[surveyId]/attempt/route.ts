import { auth } from "@/auth";
import { getExistingAttempt, deleteExistingAttempt, createNewAttempt, completeExistingAttempt } from "@/libs/services/attemptService";
import { getQuestionsForSurvey } from "@/libs/services/questionService";
import { saveResponse, getResponsesForAttempt } from "@/libs/services/responseService";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";
import { QuestionDao } from "@/libs/models/frontend/question";
import { QuestionResponseInput } from "@/libs/models/frontend/result";
import { db } from "@/libs/db";

type StoredResponse = Awaited<ReturnType<typeof getResponsesForAttempt>>[number];

/**
 * Turns stored rows back into the display values the survey form works with:
 * the option's text rather than its index, 'positive'/'negative' rather than a
 * boolean.
 */
function toDisplayResponses(storedResponses: StoredResponse[], questions: QuestionDao[]) {
    const displayResponses: Record<string, string | number> = {};

    for (const storedResponse of storedResponses) {
        const question = questions.find(q => q.id === storedResponse.questionId);
        if (!question) continue;

        switch (question.questionType) {
            case 'open-ended':
                if (storedResponse.response !== null) {
                    displayResponses[question.id] = storedResponse.response;
                }
                break;
            case 'multiple-choice':
                if (storedResponse.selectedOption !== null) {
                    const optionText = question.options[storedResponse.selectedOption];
                    if (optionText !== undefined) {
                        displayResponses[question.id] = optionText;
                    }
                }
                break;
            case 'binary-choice':
                if (storedResponse.choice !== null) {
                    displayResponses[question.id] = storedResponse.choice ? 'positive' : 'negative';
                }
                break;
            case 'likert-scale':
                if (storedResponse.rating !== null) {
                    displayResponses[question.id] = storedResponse.rating;
                }
                break;
        }
    }

    return displayResponses;
}

/**
 * Turns a display value from the survey form into a response we can store, or
 * null when the value does not belong to the question (an option that is not
 * on the question, a rating that is not a number).
 */
function toResponseInput(question: QuestionDao, value: unknown): QuestionResponseInput | null {
    switch (question.questionType) {
        case 'open-ended':
            return typeof value === 'string' ? { questionType: 'open-ended', response: value } : null;
        case 'multiple-choice': {
            const index = question.options.indexOf(value as string);
            return index === -1 ? null : { questionType: 'multiple-choice', selectedOptionIndex: index };
        }
        case 'binary-choice':
            return value === 'positive' || value === 'negative'
                ? { questionType: 'binary-choice', selectedOption: value }
                : null;
        case 'likert-scale': {
            const rating = Number(value);
            return Number.isInteger(rating) && rating >= 1 && rating <= 5
                ? { questionType: 'likert-scale', selectedValue: rating }
                : null;
        }
    }
}

function jsonResponse(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return jsonResponse({ attempt: null }, 200);
    }

    try {
        const { surveyId } = await params;
        const attempt = await getExistingAttempt(surveyId, session.user.id);
        if (!attempt) {
            return jsonResponse({ attempt: null }, 200);
        }

        const [storedResponses, questionsSurvey] = await Promise.all([
            getResponsesForAttempt(attempt.id),
            getQuestionsForSurvey(surveyId),
        ]);

        return jsonResponse({
            attempt,
            responses: toDisplayResponses(storedResponses, questionsSurvey)
        }, 200);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return jsonResponse({ attempt: null }, 200);
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
        return jsonResponse({ success: true }, 200);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return new Response("Attempt not found", { status: 404 });
        }
        const message = error instanceof Error ? error.message : "Unexpected error";
        return new Response(message, { status: 500 });
    }
}

/**
 * Saves a batch of answers to the in-progress attempt, starting one if the
 * user has not begun yet.
 *
 * The client may send the `attemptId` it believes it is answering. A save that
 * names an attempt which is no longer current — because the user restarted in
 * another tab — is rejected rather than silently resurrecting discarded
 * answers.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const { surveyId } = await params;
        const body = await request.json();

        if (typeof body !== "object" || body === null) {
            return new Response("Expected an object of answers.", { status: 400 });
        }

        const { attemptId: expectedAttemptId, answers } = body;

        if (typeof answers !== "object" || answers === null) {
            return new Response("Expected an 'answers' object.", { status: 400 });
        }

        const questionsSurvey = await getQuestionsForSurvey(surveyId);

        const result = await db.transaction(async (tx) => {
            const attempt = await createNewAttempt(surveyId, session.user.id, tx);

            if (expectedAttemptId !== undefined && expectedAttemptId !== attempt.id) {
                return { conflict: true as const, attemptId: attempt.id };
            }

            for (const [questionId, value] of Object.entries(answers)) {
                const question = questionsSurvey.find(q => q.id === questionId);
                if (!question) continue;

                const responseInput = toResponseInput(question, value);
                if (!responseInput) continue;

                await saveResponse(attempt.id, questionId, responseInput, tx);
            }

            return { conflict: false as const, attemptId: attempt.id };
        });

        if (result.conflict) {
            return jsonResponse({
                error: "This attempt is no longer current. Reload to continue.",
                attemptId: result.attemptId
            }, 409);
        }

        return jsonResponse({ success: true, attemptId: result.attemptId }, 200);
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

        const [questionsSurvey, storedResponses] = await Promise.all([
            getQuestionsForSurvey(surveyId),
            getResponsesForAttempt(attempt.id),
        ]);

        // One row per question is guaranteed by responses_attempt_question_unique,
        // so a plain count answers "has every question been answered?".
        if (storedResponses.length < questionsSurvey.length) {
            return new Response("Please answer all questions before submitting.", { status: 400 });
        }

        const completedAttempt = await completeExistingAttempt(attempt.id, session.user.id);

        return jsonResponse({ success: true, attempt: completedAttempt }, 200);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return new Response("Attempt not found", { status: 404 });
        }
        const message = error instanceof Error ? error.message : "Unexpected error";
        return new Response(message, { status: 500 });
    }
}
