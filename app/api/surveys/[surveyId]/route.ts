import { getQuestionsForSurvey } from "@/libs/services/questionService";
import { editSurvey, getSurvey } from "@/libs/services/surveyService";
import { auth } from "@/auth";

import { NotFoundError } from "@/libs/models/Errors/notFoundError";

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    try {
        const { surveyId } = await params;
        const survey = await getSurvey(surveyId);
        const questionsSurvey = await getQuestionsForSurvey(surveyId);

        const aggregatedSurvey = { ...survey, questions: questionsSurvey };
        return new Response(JSON.stringify(aggregatedSurvey), { status: 200 });
    }
    catch (reason) {
        if (reason instanceof NotFoundError) {
            return new Response(reason.message, { status: 404 });
        }
        const message = reason instanceof Error ? reason.message : 'Unexpected exception'

        return new Response(message, { status: 500 });
    }
}

/**
 * Updates a survey the caller owns — including whether it accepts anonymous
 * answers, which is the only way to close one that was opened by mistake.
 *
 * `editSurvey` does the ownership check and reports someone else's survey as
 * missing, so a 404 here can mean either.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    const session = await auth();

    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (session.user.isAnonymous) {
        return new Response("Guest accounts cannot edit surveys.", { status: 403 });
    }

    try {
        const { surveyId } = await params;
        const body = await request.json();

        if (typeof body?.title !== "string" || typeof body?.description !== "string") {
            return new Response("Bad request. Please check both title and description are defined.", { status: 400 });
        }

        const survey = await editSurvey(
            surveyId,
            session.user.id,
            body.title,
            body.description,
            body.openToAnyone === true
        );

        return new Response(JSON.stringify(survey), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    catch (reason) {
        if (reason instanceof NotFoundError) {
            return new Response(reason.message, { status: 404 });
        }
        const message = reason instanceof Error ? reason.message : 'Unexpected exception'

        return new Response(message, { status: 500 });
    }
}
