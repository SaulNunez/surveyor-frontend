import { getQuestionsForSurvey } from "@/libs/services/questionService";
import { getSurvey } from "@/libs/services/surveyService";

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