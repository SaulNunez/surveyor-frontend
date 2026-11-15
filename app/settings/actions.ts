import type { PublicUser } from "@/libs/services/auth/userService";

export async function changeDisplayName(
    newDisplayName: string,
    // Passed in rather than written here: this module has no catalog, while the
    // form that calls it does.
    failureMessage: string,
): Promise<PublicUser> {
    const res = await fetch("/api/user", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: newDisplayName }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? failureMessage);
    }

    return await res.json();
}
