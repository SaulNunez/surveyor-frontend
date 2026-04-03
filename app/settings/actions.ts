export async function changeDisplayName(newDisplayName: string) {
    const res = await fetch("/api/user", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: newDisplayName }),
    });
    return await res.json();
}