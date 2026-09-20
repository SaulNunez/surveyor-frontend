import { Session } from "next-auth";
import { isSurveyOpenToAnyone } from "@/libs/services/surveyService";

/**
 * Refuses a guest account on a survey that does not accept anonymous answers,
 * for the handlers that write an attempt.
 *
 * A 403 rather than the 404 the ownership checks use: that convention exists
 * to avoid leaking which surveys exist, and a survey's existence is already
 * public here — the visitor is looking at it. "Sign in to answer this one" is
 * both true and useful; "not found" would not be.
 *
 * Returns the response to send, or null when the request may proceed.
 */
export async function rejectGuestOnClosedSurvey(
    session: Session,
    surveyPublicId: string
): Promise<Response | null> {
    if (!session.user.isAnonymous) {
        return null;
    }

    if (await isSurveyOpenToAnyone(surveyPublicId)) {
        return null;
    }

    return new Response("This survey requires an account. Sign in to answer.", { status: 403 });
}
