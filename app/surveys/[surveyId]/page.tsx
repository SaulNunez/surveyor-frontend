"use client"

import { Loading } from "@/components/common/Loading";
import { ServerError } from "@/components/common/ServerError";
import { SurveyDao } from "@/libs/models/frontend/survey";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import { 
  Send, 
  MessageSquare, 
  List, 
  ToggleLeft, 
  Sliders, 
  ArrowLeft,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

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

  const { data: attemptData, refetch: refetchAttempt } = useQuery({
    queryKey: ['surveyAttempt', surveyId, isLoggedIn],
    queryFn: () => fetch(`/api/survey/${surveyId}/attempt`).then(res => {
      if (!res.ok) throw new Error("Failed to fetch attempt");
      return res.json();
    }),
    enabled: !!surveyId && isLoggedIn
  });

  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (attemptData?.responses) {
      setResponses(attemptData.responses);
    } else {
      setResponses({});
    }
  }, [attemptData]);

  const handleStartAnew = async () => {
    if (!confirm("Are you sure you want to discard your current progress and start over?")) {
      return;
    }
    setIsResetting(true);
    try {
      const response = await fetch(`/api/survey/${surveyId}/attempt`, {
        method: "DELETE",
      });
      if (response.ok) {
        setResponses({});
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

  const handleResponse = async (id: string, value: any) => {
    setResponses((prev) => ({ ...prev, [id]: value }));

    if (isLoggedIn) {
      try {
        await fetch(`/api/survey/${surveyId}/attempt`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ [id]: value }),
        });
        // Refetch attempt to ensure we keep local & remote states in sync
        refetchAttempt();
      } catch (err) {
        console.error("Error saving response progress:", err);
      }
    }
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
      const response = await fetch(`/api/survey/${surveyId}/attempt`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Survey submitted successfully!");
        router.push("/surveys");
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

        {/* Active Attempt Warning Banner */}
        {attemptData?.attempt && (
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
                  We've loaded your previous responses. You can modify them or start fresh.
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

