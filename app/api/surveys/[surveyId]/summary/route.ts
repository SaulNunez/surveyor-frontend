import { assertSurveyOwnedBy, getSurveySummary } from "@/libs/services/surveyService";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";
import { auth } from "@/auth";

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new Response("Unauthorized", { status: 401 });
        }

        // A guest owns no surveys, so the ownership check below would refuse
        // this anyway — but "not found" is a poor answer to someone who simply
        // needs an account.
        if (session.user.isAnonymous) {
            return new Response("Guest accounts cannot view survey results. Register to create your own surveys.", { status: 403 });
        }

        const { surveyId } = await params;
        // Results are for the survey's author only. Without this, anyone who
        // guessed a survey id could read every answer it collected.
        await assertSurveyOwnedBy(surveyId, session.user.id);

        const summary = await getSurveySummary(surveyId);
        return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    catch (reason) {
        if (reason instanceof NotFoundError) {
            return new Response(reason.message, { status: 404 });
        }
        const message = reason instanceof Error ? reason.message : 'Unexpected exception';
        return new Response(message, { status: 500 });
    }
}
