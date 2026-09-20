import { createUser, linkAnonymousAccount } from "@/libs/services/auth/userService";
import { InvalidOperationError } from "@/libs/models/Errors/invalidOperationError";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const session = await auth();

    try {
        const body = await request.json();
        if(!body['email'] || !body['password']){
            return NextResponse.json({ message: "Bad request" }, { status: 400 });
        }
        const { email, password } = body;

        const upgrading = session?.user?.isAnonymous === true;

        const user = upgrading
            // Claim the guest account in place rather than making a new one:
            // the user id stays the same, so every attempt and response it
            // already recorded carries over. `linkAnonymousAccount` re-checks
            // in SQL — the session's `isAnonymous` claim is not authoritative.
            ? await linkAnonymousAccount(session!.user.id, email, password)
            : await createUser({ email, password });

        return NextResponse.json({ ...user, upgraded: upgrading }, { status: 201 });
    }
    catch (reason) {
        // A taken email, or a guest account that was claimed already. Both are
        // conflicts with state that exists, not malformed requests — the
        // client has to tell them apart from the 400 above.
        if (reason instanceof InvalidOperationError) {
            return NextResponse.json({ message: reason.message }, { status: 409 });
        }

        const message = reason instanceof Error ? reason.message : 'Unexpected exception'

        return NextResponse.json({ message }, { status: 500 });
    }
}
