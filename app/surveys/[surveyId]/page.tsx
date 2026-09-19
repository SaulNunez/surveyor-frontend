"use client"

import { Loading } from "@/components/common/Loading";
import { ServerError } from "@/components/common/ServerError";
import { SurveyDao } from "@/libs/models/frontend/survey";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { 
  Send, 
  MessageSquare, 
  List, 
  ToggleLeft, 
  Sliders, 
  ArrowLeft,
  RotateCcw,
  AlertCircle,
  UserPlus
} from "lucide-react";
import Link from "next/link";

// Answers are batched for this long before being saved, so holding down a key
// produces one request rather than dozens.
const SAVE_DEBOUNCE_MS = 500;

export default function SurveyAnswer() {
  const params = useParams();
  const surveyId = params?.surveyId as string;
  const router = useRouter();

  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const querySurvey = () =>
    fetch(`/api/surveys/${surveyId}`).then(response => {
      if (!response.ok) {
        throw new Error('HTTP error ' + response.status);
      }
      return response.json();
    });

  const { isPending, error, data: survey } = useQuery<SurveyDao>({
    queryKey: ['survey', surveyId],
    queryFn: querySurvey,
    enabled: !!surveyId
  });

  // `enabled` alone gates the fetch. Keying on the login state as well would
  // swap in a fresh, empty cache entry the moment a guest signs in mid-answer,
  // taking the answers they had just typed with it.
  const { data: attemptData, refetch: refetchAttempt } = useQuery({
    queryKey: ['surveyAttempt', surveyId],
    queryFn: () => fetch(`/api/survey/${surveyId}/attempt`).then(res => {
      if (!res.ok) throw new Error("Failed to fetch attempt");
      return res.json();
    }),
    enabled: !!surveyId && isLoggedIn
  });

  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isResetting, setIsResetting] = useState(false);
  const [hasInitialAttempt, setHasInitialAttempt] = useState<boolean | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "needs-account">("idle");

  // Answers changed since the last save, held until the debounce fires so that
  // typing produces one batched request instead of one per keystroke.
  const pendingAnswers = useRef<Record<string, any>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The attempt these saves belong to. Sent with each save so the server can
  // reject writes aimed at an attempt that was restarted in another tab.
  const attemptId = useRef<string | null>(null);
  // Set by the paths that deliberately throw answers away — Start Anew, and a
  // rejected save — so the next server response replaces local state instead
  // of being merged into it.
  const discardLocalResponses = useRef(false);
  // A burst of keystrokes must mint exactly one guest account, so every caller
  // in the burst awaits the same sign-in. Assigned before the first await for
  // that reason.
  const anonymousSignIn = useRef<Promise<boolean> | null>(null);
  // A guest account minted during this page load is brand new, so the attempt
  // that appears a moment later is the one being started right now — not one
  // to announce as resumed.
  const mintedGuestHere = useRef(false);

  const canAnswerAnonymously = survey?.openToAnyone === true;

  /**
   * Makes sure there is an account to save against, signing the visitor in as
   * a guest if the survey allows it. Returns false when answers cannot be
   * saved at all, which is the caller's cue to say so rather than fail quietly.
   */
  const ensureAnswerIdentity = useCallback(async () => {
    if (status === "authenticated") return true;
    if (status === "loading") return false;
    if (!canAnswerAnonymously) return false;

    if (!anonymousSignIn.current) {
      anonymousSignIn.current = signIn("anonymous", { surveyId, redirect: false })
        .then(result => !!result && !result.error)
        .catch(() => false);
    }

    const signedIn = await anonymousSignIn.current;
    if (signedIn) mintedGuestHere.current = true;
    // Cleared only on failure, so a later save can try again; a success stays
    // cached and no second account is ever minted.
    if (!signedIn) anonymousSignIn.current = null;
    return signedIn;
  }, [status, canAnswerAnonymously, surveyId]);

  useEffect(() => {
    if (attemptData !== undefined && hasInitialAttempt === null) {
      setHasInitialAttempt(!mintedGuestHere.current && !!attemptData?.attempt);
    }
  }, [attemptData, hasInitialAttempt]);

  useEffect(() => {
    // Undefined means the query has not answered yet — for a guest, that is
    // every render before they sign in. Clearing state here would wipe what
    // they are in the middle of typing.
    if (attemptData === undefined) return;

    attemptId.current = attemptData.attempt?.id ?? null;

    if (discardLocalResponses.current) {
      discardLocalResponses.current = false;
      setResponses(attemptData.responses ?? {});
      return;
    }

    // Merge rather than replace: answers typed while the request was in flight
    // are newer than what came back, and anything still queued for saving has
    // not reached the server at all yet.
    setResponses(prev => ({
      ...prev,
      ...(attemptData.responses ?? {}),
      ...pendingAnswers.current,
    }));
  }, [attemptData]);

  const flushPendingAnswers = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const answers = pendingAnswers.current;
    if (Object.keys(answers).length === 0) return;
    pendingAnswers.current = {};

    if (!await ensureAnswerIdentity()) {
      // Hold onto the answers the same way a failed request does, so they are
      // saved if the visitor signs in without reloading.
      pendingAnswers.current = { ...answers, ...pendingAnswers.current };
      setSaveState("needs-account");
      return;
    }

    setSaveState("saving");
    try {
      const response = await fetch(`/api/survey/${surveyId}/attempt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attemptId.current ?? undefined, answers }),
      });

      if (response.status === 409) {
        // Someone restarted this attempt elsewhere; the answers we were holding
        // belong to an attempt that no longer exists.
        setSaveState("error");
        alert("This attempt was restarted somewhere else. Reloading your progress.");
        discardLocalResponses.current = true;
        await refetchAttempt();
        return;
      }

      if (response.status === 401 || response.status === 403) {
        // The survey does not accept this account. Retrying cannot help, so
        // the answers are dropped rather than queued forever.
        setSaveState("needs-account");
        return;
      }

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const body = await response.json();
      attemptId.current = body.attemptId ?? attemptId.current;
      setSaveState("saved");
    } catch (err) {
      console.error("Error saving response progress:", err);
      // Put the answers back so the next save retries them.
      pendingAnswers.current = { ...answers, ...pendingAnswers.current };
      setSaveState("error");
    }
  }, [surveyId, refetchAttempt, ensureAnswerIdentity]);

  // Don't strand answers the user typed just before navigating away.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleStartAnew = async () => {
    if (!confirm("Are you sure you want to discard your current progress and start over?")) {
      return;
    }
    setIsResetting(true);

    // Drop anything still queued: it belongs to the attempt being discarded.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    pendingAnswers.current = {};
    setSaveState("idle");

    try {
      // Discards the old attempt and starts a new one in a single transaction,
      // so a failure part-way cannot leave the user with no attempt at all.
      const response = await fetch(`/api/survey/${surveyId}/attempt/restart`, {
        method: "POST",
      });
      if (response.ok) {
        const body = await response.json();
        attemptId.current = body.attempt?.id ?? null;
        setResponses({});
        setHasInitialAttempt(false);
        discardLocalResponses.current = true;
        await refetchAttempt();
      } else {
        alert("Failed to reset attempt. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while resetting your attempt.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleResponse = (id: string, value: any) => {
    setResponses((prev) => ({ ...prev, [id]: value }));

    // A visitor who cannot be signed in gets told so, rather than watching
    // their answers vanish on reload with nothing having said a word.
    if (!isLoggedIn && !canAnswerAnonymously) {
      setSaveState("needs-account");
      return;
    }

    pendingAnswers.current[id] = value;
    setSaveState("saving");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flushPendingAnswers(); }, SAVE_DEBOUNCE_MS);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!survey?.questions) return;
    
    // Check if all questions are answered
    const unansweredCount = survey.questions.filter(q => !responses[q.id]).length;
    if (unansweredCount > 0) {
      alert(`Please answer all questions before submitting. You have ${unansweredCount} unanswered question(s).`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Make sure the last debounced answers reach the server before the
      // completeness check runs against them.
      await flushPendingAnswers();

      const response = await fetch(`/api/survey/${surveyId}/attempt`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Survey submitted successfully!");
        router.push("/surveys");
      } else if (response.status === 401 || response.status === 403) {
        alert("Sign in to submit your answers.");
      } else {
        const text = await response.text();
        alert(`Failed to submit survey: ${text}`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center py-20">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6">
        <ServerError />
        <Link 
          href="/surveys" 
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl border border-gray-200 dark:border-gray-700 transition"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        {/* Navigation breadcrumb */}
        <div className="mb-6">
          <Link
            href="/surveys"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
          >
            <ArrowLeft size={16} /> Back to Surveys
          </Link>
        </div>

        {/* Guest Account Banner */}
        {session?.user?.isAnonymous && (
          canAnswerAnonymously ? (
            <div className="mb-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    You&apos;re answering as a guest
                  </h3>
                  <p className="text-xs text-blue-700/80 dark:text-blue-300/70 mt-0.5">
                    Your answers are saved to a guest account <strong>on this device</strong>.
                    Create an account to keep them.
                  </p>
                </div>
              </div>
              <Link
                href="/register"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Create account
              </Link>
            </div>
          ) : (
            <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-900 dark:text-red-100">
                    This survey needs a full account
                  </h3>
                  <p className="text-xs text-red-700/80 dark:text-red-300/70 mt-0.5">
                    Guest accounts cannot answer it, so nothing you type here is being
                    saved. Create an account to answer.
                  </p>
                </div>
              </div>
              <Link
                href="/register"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Create account
              </Link>
            </div>
          )
        )}

        {/* Active Attempt Warning Banner */}
        {hasInitialAttempt && attemptData?.attempt && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-200 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-xl">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                  Resuming Existing Attempt
                </h3>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                  We&apos;ve loaded your previous responses. You can modify them or start fresh.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isResetting}
              onClick={handleStartAnew}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition cursor-pointer self-start sm:self-center"
            >
              <RotateCcw size={14} className={isResetting ? "animate-spin" : ""} />
              {isResetting ? "Starting Anew..." : "Start Anew"}
            </button>
          </div>
        )}

        {/* Header Section */}
        <header className="mb-8 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow hover:shadow-md transition">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            {survey?.title}
          </h1>
          {survey?.description && (
            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-405 pt-2 border-t border-gray-100 dark:border-gray-800">
              <ReactMarkdown>{survey.description}</ReactMarkdown>
            </div>
          )}
        </header>

        {/* Questions Section */}
        <div className="space-y-6 mb-8">
          {survey?.questions.map((q, index) => (
            <div
              key={q.id}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow p-6 hover:shadow-md transition"
            >
              {/* Question Header */}
              <div className="flex justify-between items-start gap-4 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 font-mono">
                    Q{index + 1}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md border border-blue-100/50 dark:border-blue-800/20 capitalize">
                    {q.questionType.replace("-", " ")}
                  </span>
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {q.title || <span className="text-gray-400 dark:text-gray-650 italic font-normal">Untitled Question</span>}
              </h2>

              {/* Open Question */}
              {q.questionType === "open-ended" && (
                <div className="relative">
                  <MessageSquare size={16} className="absolute top-3.5 left-3.5 text-gray-400" />
                  <textarea
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-y min-h-[6rem]"
                    placeholder="Type your response here..."
                    value={responses[q.id] || ""}
                    onChange={(e) => handleResponse(q.id, e.target.value)}
                  />
                </div>
              )}

              {/* Multiple Choice */}
              {q.questionType === "multiple-choice" && (
                <div className="space-y-2.5">
                  {q.options.map((opt, idx) => {
                    const isSelected = responses[q.id] === opt;
                    return (
                      <label 
                        key={idx} 
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition select-none ${
                          isSelected 
                            ? 'bg-blue-50/40 border-blue-300 dark:bg-blue-950/20 dark:border-blue-900/50 text-blue-950 dark:text-blue-300' 
                            : 'bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={isSelected}
                          onChange={() => handleResponse(q.id, opt)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-900 dark:bg-gray-700 dark:border-gray-650"
                        />
                        <span className="text-sm font-semibold">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Binary Choice */}
              {q.questionType === "binary-choice" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { val: "negative", label: q.negativeLabel || "No" },
                    { val: "positive", label: q.positiveLabel || "Yes" }
                  ].map(({ val, label }) => {
                    const isSelected = responses[q.id] === val;
                    return (
                      <label 
                        key={val} 
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition select-none ${
                          isSelected 
                            ? 'bg-blue-50/40 border-blue-300 dark:bg-blue-950/20 dark:border-blue-900/50 text-blue-950 dark:text-blue-300' 
                            : 'bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={val}
                          checked={isSelected}
                          onChange={() => handleResponse(q.id, val)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-900 dark:bg-gray-700 dark:border-gray-650"
                        />
                        <span className="text-sm font-semibold">{label}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Likert Scale */}
              {q.questionType === "likert-scale" && (
                <div className="pt-1">
                  <div className="flex justify-between mb-3 text-xs font-semibold text-gray-500 dark:text-gray-450 uppercase tracking-wider select-none">
                    <span>{q.negativeLabel || "Strongly Disagree"}</span>
                    <span>{q.positiveLabel || "Strongly Agree"}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2.5">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isSelected = responses[q.id] === num;
                      return (
                        <label 
                          key={num} 
                          className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border cursor-pointer transition text-center select-none ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs' 
                              : 'bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={num}
                            checked={isSelected}
                            onChange={() => handleResponse(q.id, num)}
                            className="sr-only"
                          />
                          <span className="text-lg font-bold">{num}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer / Submit survey */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow">
          <div className="text-left">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Ready to send?</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Make sure you have completed all questions before sending.</p>
            {saveState !== "idle" && (
              <p
                role="status"
                className={`text-xs mt-1 ${saveState === "error" || saveState === "needs-account" ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}
              >
                {saveState === "saving" && "Saving your progress..."}
                {saveState === "saved" && "Progress saved."}
                {saveState === "error" && "Could not save your progress. It will be retried."}
                {saveState === "needs-account" && (
                  <>
                    Your answers are not being saved.{" "}
                    <Link href="/login" className="underline font-semibold">
                      Sign in to save them
                    </Link>
                    .
                  </>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            <Send size={16} className={isSubmitting ? "animate-pulse" : ""} />
            {isSubmitting ? "Submitting..." : "Submit Responses"}
          </button>
        </div>
      </div>
    </div>
  );
}

