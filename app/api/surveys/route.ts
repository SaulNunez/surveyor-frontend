import { createSurvey } from "@/libs/services/surveyService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { SurveyInput } from "@/libs/models/frontend/survey";
import dbConnect from "@/app/lib/data";

export async function POST(request: Request) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    try {
        const body: SurveyInput = await request.json();
        if(!body.hasOwnProperty("title") 
            || !body.hasOwnProperty("description") 
            || !body.hasOwnProperty("questions"))
        {
            return new Response("Bad request. Please check both title, questions and description are defined.", { status: 400 })
        }

        if(!Array.isArray(body["questions"])){
             return new Response("Questions should be an array!", { status: 400 })
        }

        const title = body["title"];
        const description = body["description"];

        const survey = await createSurvey(title, description, session?.user?.email);
        
        const questions = body["questions"].map(async(question) => await createQuestion(survey.id, question));
        const result = Promise.all(questions);
        const response = {id: survey.id };
        return new Response(JSON.stringify(response) , { status: 201 });
    }
    catch(reason){
        const message = reason instanceof Error ? reason.message : 'Unexpected exception'
    
        return new Response(message, { status: 500 });
    }
}

function createQuestion(arg0: string, questionData: any): any {
    throw new Error("Function not implemented.");
}
