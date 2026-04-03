import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, updateUserName } from "@/libs/services/auth/userService";

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { displayName } = await req.json();
  if (!displayName) {
    return NextResponse.json(
      { message: "Display name is required" },
      { status: 400 }
    );
  }

  try {
    const user = await getUserByEmail(session.user?.email);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    
    await updateUserName(user._id.toString(), displayName);
    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { message: "Failed to update user" },
      { status: 500 }
    );
  }
}
