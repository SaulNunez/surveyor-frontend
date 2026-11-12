import { auth } from "@/auth";
import { restartAttempt } from "@/libs/services/attemptService";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";
import { rejectGuestOnClosedSurvey } from "../_guard";
import { msg } from "@lingui/core/macro";
import { errorMessage, translate } from "@/libs/i18n/apiErrors";

/**
 * Discards the in-progress attempt and starts a fresh one atomically, so a
 * restart cannot leave the user with no attempt if the request fails midway.
 */
export async function POST(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return new Response(await translate(msg`Unauthorized`), { status: 401 });
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
            return new Response(await errorMessage(error), { status: 404 });
        }
        return new Response(await errorMessage(error), { status: 500 });
    }
}
