"use client"

import React from "react";
import ReactMarkdown from "react-markdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { OpenEndedSummary } from "@/libs/models/frontend/survey";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";

// A descriptor rather than a string: this module has no catalog of its own, so
// the component resolves it with the one in React context.
const FAILED_TO_GENERATE = msg`Failed to generate a summary`;

async function generateSummary(
  surveyId: string,
  questionId: string,
  failureMessage: string,
) {
  const res = await fetch(`/api/surveys/${surveyId}/questions/${questionId}/summary`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error((await res.text()) || failureMessage);
  }
  return res.json();
}

function formatGeneratedAt(isoDate: string, locale: string) {
  const parsed = new Date(isoDate);
  return Number.isNaN(parsed.getTime()) ? isoDate : parsed.toLocaleString(locale);
}

export function OpenEndedSummaryCard({
  surveyId,
  question,
  aiAvailable,
}: {
  surveyId: string;
  question: OpenEndedSummary;
  aiAvailable: boolean;
}) {
  const queryClient = useQueryClient();
  const { i18n } = useLingui();

  const mutation = useMutation({
    mutationFn: () => generateSummary(surveyId, question.id, i18n._(FAILED_TO_GENERATE)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveySummary", surveyId] });
    },
  });

  const { responses, aiSummary } = question;
  const hasResponses = responses.length > 0;
  // The summary was generated over fewer answers than are on screen now.
  const isStale = aiSummary !== null && aiSummary.responseCount < responses.length;

  return (
    <div className="mt-4 space-y-4">
      {aiAvailable && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!hasResponses || mutation.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {aiSummary ? <RefreshCw size={16} className={mutation.isPending ? "animate-spin" : ""} /> : <Sparkles size={16} />}
            {mutation.isPending ? (
              <Trans>Summarizing…</Trans>
            ) : aiSummary ? (
              <Trans>Regenerate summary</Trans>
            ) : (
              <Trans>Summarize responses</Trans>
            )}
          </button>
          {!hasResponses && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              <Trans>Nothing to summarize yet.</Trans>
            </span>
          )}
          {isStale && !mutation.isPending && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              <Trans>New responses have arrived since this summary.</Trans>
            </span>
          )}
        </div>
      )}

      {mutation.isError && (
        <div
          role="alert"
          className="flex gap-2.5 items-start text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3 rounded-xl"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{mutation.error instanceof Error ? mutation.error.message : i18n._(FAILED_TO_GENERATE)}</p>
        </div>
      )}

      {aiSummary && (
        <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              <Trans>Recurring topics</Trans>
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
            <ReactMarkdown>{aiSummary.text}</ReactMarkdown>
          </div>
          <p className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/30 text-xs text-gray-500 dark:text-gray-400">
            {aiSummary.provider} &middot; {aiSummary.model} &middot;{" "}
            <Plural value={aiSummary.responseCount} one="# response" other="# responses" /> &middot;{" "}
            {formatGeneratedAt(aiSummary.generatedAt, i18n.locale)}
          </p>
        </div>
      )}

      {hasResponses ? (
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2">
          {responses.map((response, idx) => (
            <div
              key={idx}
              className="flex gap-2.5 items-start text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3 rounded-lg shadow-2xs"
            >
              <MessageSquare size={16} className="text-indigo-500 mt-0.5 shrink-0" />
              <p className="whitespace-pre-wrap">{response}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="dark:text-gray-400 text-gray-500 italic">
          <Trans>No responses received yet.</Trans>
        </p>
      )}
    </div>
  );
}
