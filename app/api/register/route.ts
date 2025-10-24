import dbConnect from "@/app/lib/data";
import { createUser } from "@/libs/services/auth/userService";

export async function GET(request: Request) {
    await dbConnect();
    try {
        const body = await request.json();
        if(!body['email'] || !body['password']){
            return new Response("Bad request", { status: 400 });
        }
        const { email, password } = body;
        await createUser({email, password});
        return new Response("Created successfully!" , { status: 201 });
    }
    catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Unexpected exception'

        return new Response(message, { status: 500 });
    }
}