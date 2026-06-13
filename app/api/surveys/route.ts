import { createSurvey } from "@/libs/services/surveyService";
import { SurveyInput } from "@/libs/models/frontend/survey";
import { auth } from "@/auth";

export async function POST(request: Request) {
    const session = await auth();

    try {
        const body: SurveyInput = await request.json();
        if (!body.hasOwnProperty("title")
            || !body.hasOwnProperty("description")
            || !body.hasOwnProperty("questions")) {
            return new Response("Bad request. Please check both title, questions and description are defined.", { status: 400 })
        }

        if (!Array.isArray(body["questions"])) {
            return new Response("Questions should be an array!", { status: 400 })
        }

        const title = body["title"];
        const description = body["description"];

        if (!session?.user) {
            return new Response("Unauthorized", { status: 401 })
        }

        if (!session.user.email) {
            throw new Error("Email not defined!");
        }

        const surveyResult = await createSurvey(title, description, session.user.email);

        const questions = body["questions"].map(async (question) => await createQuestion(surveyResult.id, question));
        await Promise.all(questions);
        const response = { id: surveyResult.id };
        return new Response(JSON.stringify(response), { status: 201 });
    }
    catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Unexpected exception'

        return new Response(message, { status: 500 });
    }
}

function createQuestion(arg0: string, questionData: any): any {
    throw new Error("Function not implemented.");
}
