import { createSurvey } from "@/libs/services/surveyService";
import { SurveyInput } from "@/libs/models/frontend/survey";
import { auth } from "@/auth";
import { createQuestion } from "@/libs/services/questionService";
import { msg } from "@lingui/core/macro";
import { errorMessage, translate } from "@/libs/i18n/apiErrors";

export async function POST(request: Request) {
    const session = await auth();

    try {
        const body: SurveyInput = await request.json();
        if (!body.hasOwnProperty("title")
            || !body.hasOwnProperty("description")
            || !body.hasOwnProperty("questions")) {
            return new Response(
                await translate(msg`Bad request. Please check both title, questions and description are defined.`),
                { status: 400 }
            )
        }

        if (!Array.isArray(body["questions"])) {
            return new Response(await translate(msg`Questions should be an array!`), { status: 400 })
        }

        const title = body["title"];
        const description = body["description"];

        if (!session?.user) {
            return new Response(await translate(msg`Unauthorized`), { status: 401 })
        }

        if (session.user.isAnonymous) {
            return new Response(
                await translate(msg`Guest accounts cannot create surveys. Register to keep your answers and create your own.`),
                { status: 403 }
            )
        }

        // Strict equality, so a missing or malformed field leaves the survey
        // closed. Opening one has to be deliberate.
        const openToAnyone = body["openToAnyone"] === true;

        const surveyResult = await createSurvey(title, description, session.user.id, openToAnyone);

        const questions = body["questions"].map(async (question) => await createQuestion(surveyResult.id, question));
        await Promise.all(questions);
        const response = { id: surveyResult.id };
        return new Response(JSON.stringify(response), { status: 201 });
    }
    catch (reason) {
        return new Response(await errorMessage(reason), { status: 500 });
    }
}
