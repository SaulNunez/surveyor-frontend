import { auth } from "@/auth";
import { restartAttempt } from "@/libs/services/attemptService";

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
        const attempt = await restartAttempt(surveyId, session.user.id);

        return new Response(JSON.stringify({ success: true, attempt }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return new Response(message, { status: 500 });
    }
}
