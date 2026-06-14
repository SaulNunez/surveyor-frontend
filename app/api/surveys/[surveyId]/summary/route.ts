import { getSurveySummary } from "@/libs/services/surveyService";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    try {
        const { surveyId } = await params;
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
