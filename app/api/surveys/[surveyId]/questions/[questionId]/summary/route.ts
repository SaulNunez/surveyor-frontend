import { auth } from "@/auth";
import { generateSummaryForQuestion } from "@/libs/services/questionSummaryService";
import { InvalidOperationError } from "@/libs/models/Errors/invalidOperationError";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";
import { msg } from "@lingui/core/macro";
import { errorMessage, translate } from "@/libs/i18n/apiErrors";

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
            return new Response(await translate(msg`Unauthorized`), { status: 401 });
        }

        // A guest owns no surveys, so the ownership check below would refuse
        // this anyway — but "not found" is a poor answer to someone who simply
        // needs an account.
        if (session.user.isAnonymous) {
            return new Response(
                await translate(msg`Guest accounts cannot view survey results. Register to create your own surveys.`),
                { status: 403 }
            );
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
            return new Response(await errorMessage(reason), { status: 404 });
        }
        if (reason instanceof InvalidOperationError) {
            return new Response(await errorMessage(reason), { status: 400 });
        }
        return new Response(await errorMessage(reason), { status: 500 });
    }
}
