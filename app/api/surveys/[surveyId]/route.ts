import { getQuestionsForSurvey } from "@/libs/services/questionService";
import { getSurvey } from "@/libs/services/surveyService";
import { useRouter } from "next/router";

export async function GET(request: Request) {
    const router = useRouter();
    try {
        const { surveyId } = router.query;
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