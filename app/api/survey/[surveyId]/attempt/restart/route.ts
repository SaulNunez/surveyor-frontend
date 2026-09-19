import { auth } from "@/auth";
import { restartAttempt } from "@/libs/services/attemptService";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";
import { rejectGuestOnClosedSurvey } from "../_guard";

/**
 * Discards the in-progress attempt and starts a fresh one atomically, so a
 * restart cannot leave the user with no attempt if the request fails midway.
 */
export async function POST(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const { surveyId } = await params;

        const refusal = await rejectGuestOnClosedSurvey(session, surveyId);
        if (refusal) return refusal;

        const attempt = await restartAttempt(surveyId, session.user.id);

        return new Response(JSON.stringify({ success: true, attempt }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return new Response("Survey not found", { status: 404 });
        }
        const message = error instanceof Error ? error.message : "Unexpected error";
        return new Response(message, { status: 500 });
    }
}
