import { createUser } from "@/libs/services/auth/userService";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        if(!body['email'] || !body['password']){
            return NextResponse.json({ message: "Bad request" }, { status: 400 });
        }
        const { email, password } = body;
        await createUser({email, password});
        return NextResponse.json({ message: "Created successfully!" }, { status: 201 });
    }
    catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Unexpected exception'

        return NextResponse.json({ message }, { status: 500 });
    }
}