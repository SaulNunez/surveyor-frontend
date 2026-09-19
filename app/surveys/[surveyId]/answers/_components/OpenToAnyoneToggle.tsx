"use client"

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Lock, Loader2 } from "lucide-react";
import { SurveySummaryDao } from "@/libs/models/frontend/survey";

/**
 * Lets the survey's author open it to guests, or close it again. The title and
 * description go along with the request because the edit endpoint takes the
 * whole survey; they are sent back unchanged.
 */
export function OpenToAnyoneToggle({ survey }: { survey: SurveySummaryDao }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (openToAnyone: boolean) => {
      const response = await fetch(`/api/surveys/${survey.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: survey.title,
          description: survey.description,
          openToAnyone,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveySummary", survey.id] });
    },
  });

  const isOpen = survey.openToAnyone;

  return (
    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-850">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className={`p-1.5 rounded-lg ${isOpen
            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
            {isOpen ? <Globe size={16} /> : <Lock size={16} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {isOpen ? "Open to anyone" : "Account required"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isOpen
                ? "Anyone with the link can answer without an account. The same person can answer again from a different browser."
                : "Only people signed in with an account can answer."}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(!isOpen)}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 transition"
        >
          {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
          {isOpen ? "Require an account" : "Open to anyone"}
        </button>
      </div>
      {mutation.error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-2">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
