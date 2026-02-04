import dbConnect from "@/app/lib/data";
import { getQuestionsForSurvey } from "@/libs/services/questionService";
import { getSurvey } from "@/libs/services/surveyService";

import { NotFoundError } from "@/libs/models/Errors/notFoundError";

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    await dbConnect();
    try {
        const { surveyId } = await params;
        const surveyResult = await getSurvey(surveyId);

        return surveyResult.match(
            async (survey) => {
                const questionsResult = await getQuestionsForSurvey(surveyId);
                return questionsResult.match(
                    (questionsForSurvey) => {
                        const aggregatedSurvey = { ...survey, questions: questionsForSurvey };
                        return new Response(JSON.stringify(aggregatedSurvey), { status: 200 });
                    },
                    (error) => {
                        const message = error instanceof Error ? error.message : 'Unexpected exception'
                        return new Response(message, { status: 500 });
                    }
                );
            },
            (error: Error) => {
                if (error instanceof NotFoundError) {
                    return new Response(error.message, { status: 404 });
                }
                const message = error instanceof Error ? error.message : 'Unexpected exception'
                return new Response(message, { status: 500 });
            }
        );
    }
    catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Unexpected exception'

        return new Response(message, { status: 500 });
    }
}