"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { changeDisplayName } from "../actions";

export function ChangeDisplayNameForm() {
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { update } = useSession();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (displayName.trim().length < 1) {
      setError("Display name cannot be empty");
      return;
    }
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await changeDisplayName(displayName.trim());
        // Pull the new name into the JWT so the header and settings page agree.
        await update();
        router.refresh();
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change display name");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-gray-700"
        >
          New Display Name
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="displayName"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="mt-2 text-sm text-green-600">
              Display name changed successfully.
            </p>
          )}
        </div>
      </div>
      <button
        type="submit"
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        disabled={isPending}
      >
        {isPending ? "Changing..." : "Change Display Name"}
      </button>
    </form>
  );
}
