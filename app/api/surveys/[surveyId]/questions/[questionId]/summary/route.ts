import { auth } from "@/auth";
import { generateSummaryForQuestion } from "@/libs/services/questionSummaryService";
import { InvalidOperationError } from "@/libs/models/Errors/invalidOperationError";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";

/**
 * Generate (or regenerate) the AI summary of an open-ended question's answers.
 * POST rather than GET because it spends real money at an LLM provider.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ surveyId: string, questionId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new Response("Unauthorized", { status: 401 });
        }

        const { surveyId, questionId } = await params;
        const summary = await generateSummaryForQuestion(surveyId, questionId, session.user.id);

        return new Response(JSON.stringify({
            text: summary.summary,
            provider: summary.provider,
            model: summary.model,
            responseCount: summary.responseCount,
            generatedAt: summary.generatedAt.toISOString(),
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    catch (reason) {
        if (reason instanceof NotFoundError) {
            return new Response(reason.message, { status: 404 });
        }
        if (reason instanceof InvalidOperationError) {
            return new Response(reason.message, { status: 400 });
        }
        const message = reason instanceof Error ? reason.message : 'Unexpected exception';
        return new Response(message, { status: 500 });
    }
}
