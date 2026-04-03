"use client";

import { useState, useTransition } from "react";
import { changeDisplayName } from "../actions";

export function ChangeDisplayNameForm() {
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (displayName.length < 1) {
      setError("Display name cannot be empty");
      return;
    }
    setError(null);
    startTransition(async () => {
      const error = await changeDisplayName(displayName);
      if (error) {
        alert(error);
      } else {
        alert("Display name changed successfully!");
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
            <p className="mt-2 text-sm text-red-600">
              {error}
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
