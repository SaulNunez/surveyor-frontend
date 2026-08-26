import type { PublicUser } from "@/libs/services/auth/userService";

export async function changeDisplayName(newDisplayName: string): Promise<PublicUser> {
    const res = await fetch("/api/user", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: newDisplayName }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to change display name");
    }

    return await res.json();
}
