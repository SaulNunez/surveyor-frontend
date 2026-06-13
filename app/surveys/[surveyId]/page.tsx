"use client"

import { Loading } from "@/components/common/Loading";
import { ServerError } from "@/components/common/ServerError";
import { SurveyDao } from "@/libs/models/frontend/survey";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  Send, 
  MessageSquare, 
  List, 
  ToggleLeft, 
  Sliders, 
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";

export default function SurveyAnswer() {
  const params = useParams();
  const surveyId = params?.surveyId as string;

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

  const [responses, setResponses] = useState<Record<string, any>>({});

  const handleResponse = (id: string, value: any) => {
    setResponses({ ...responses, [id]: value });
  };

  const handleSubmit = () => {
    console.log("Survey responses:", responses);
    alert("Survey submitted! Check console for responses.");
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center py-20">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
        <ServerError />
        <Link 
          href="/surveys" 
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-gray-700 dark:text-zinc-200 font-semibold rounded-xl border border-gray-200 dark:border-zinc-700/80 transition"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        {/* Navigation breadcrumb */}
        <div className="mb-6">
          <Link
            href="/surveys"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            <ArrowLeft size={16} /> Back to Surveys
          </Link>
        </div>

        {/* Header Section */}
        <header className="mb-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/60 dark:border-zinc-800/80 shadow-sm">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            {survey?.title}
          </h1>
          {survey?.description && (
            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-zinc-300 pt-2 border-t border-gray-100 dark:border-zinc-800/80">
              <ReactMarkdown>{survey.description}</ReactMarkdown>
            </div>
          )}
        </header>

        {/* Questions Section */}
        <div className="space-y-6 mb-8">
          {survey?.questions.map((q, index) => (
            <div
              key={q.id}
              className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs p-6 hover:border-gray-300 dark:hover:border-zinc-700 transition"
            >
              {/* Question Header */}
              <div className="flex justify-between items-start gap-4 mb-4 pb-3 border-b border-gray-100 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 font-mono">
                    Q{index + 1}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md border border-blue-100/50 dark:border-blue-800/20 capitalize">
                    {q.questionType.replace("-", " ")}
                  </span>
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {q.title || <span className="text-gray-400 dark:text-zinc-650 italic font-normal">Untitled Question</span>}
              </h2>

              {/* Open Question */}
              {q.questionType === "open-ended" && (
                <div className="relative">
                  <MessageSquare size={16} className="absolute top-3.5 left-3.5 text-gray-400" />
                  <textarea
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/80 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-y min-h-[6rem]"
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
                            : 'bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-800 dark:text-zinc-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={isSelected}
                          onChange={() => handleResponse(q.id, opt)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-900 dark:bg-zinc-700 dark:border-zinc-650"
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
                            : 'bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-800 dark:text-zinc-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={val}
                          checked={isSelected}
                          onChange={() => handleResponse(q.id, val)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-900 dark:bg-zinc-700 dark:border-zinc-650"
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
                  <div className="flex justify-between mb-3 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider select-none">
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
                              : 'bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-600 dark:text-zinc-300'
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <div className="text-left">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Ready to send?</h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Make sure you have completed all questions before sending.</p>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            <Send size={16} /> Submit Responses
          </button>
        </div>
      </div>
    </div>
  );
}

