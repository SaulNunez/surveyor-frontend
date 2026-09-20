import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserName } from "@/libs/services/auth/userService";

export async function PUT(req: Request) {
  const session = await auth();

  // Keyed on the id, not the email: a guest account has no email at all, and
  // the id is what every service already identifies a user by.
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.isAnonymous) {
    return NextResponse.json(
      { message: "Guest accounts have no settings. Register first." },
      { status: 403 }
    );
  }

  const { displayName } = await req.json();
  if (typeof displayName !== "string" || displayName.trim().length === 0) {
    return NextResponse.json(
      { message: "Display name is required" },
      { status: 400 }
    );
  }

  try {
    const updated = await updateUserName(session.user.id, displayName.trim());
    if (!updated) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { message: "Failed to update user" },
      { status: 500 }
    );
  }
}
