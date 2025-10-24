import dbConnect from "@/app/lib/data";
import { getQuestionsForSurvey } from "@/libs/services/questionService";
import { getSurvey } from "@/libs/services/surveyService";

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
    await dbConnect();
    try {
        const { surveyId } = await params;
        const survey = await getSurvey(surveyId);
        const questionsForSurvey = await getQuestionsForSurvey(surveyId);

        const aggregatedSurvey = { ...survey, questions: questionsForSurvey };

        return new Response(JSON.stringify(aggregatedSurvey) , { status: 200 });
    }
    catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Unexpected exception'

        return new Response(message, { status: 500 });
    }
}