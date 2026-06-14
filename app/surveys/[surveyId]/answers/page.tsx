"use client"

import React from "react";
import ReactMarkdown from "react-markdown";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, BarChart2 } from "lucide-react";
import { Loading } from "@/components/common/Loading";
import { ServerError } from "@/components/common/ServerError";
import { SurveySummaryDao } from "@/libs/models/frontend/survey";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];

export default function SurveyAnswersPage() {
  const params = useParams();
  const surveyId = params?.surveyId as string;

  const fetchSurveySummary = async (): Promise<SurveySummaryDao> => {
    const res = await fetch(`/api/surveys/${surveyId}/summary`);
    if (!res.ok) {
      throw new Error(`Failed to fetch survey summary: ${res.statusText}`);
    }
    return res.json();
  };

  const { isPending, error, data: survey } = useQuery<SurveySummaryDao>({
    queryKey: ["surveySummary", surveyId],
    queryFn: fetchSurveySummary,
    enabled: !!surveyId
  });

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
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-black transition-colors duration-200">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/surveys"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
          >
            <ArrowLeft size={16} /> Back to Surveys
          </Link>
        </div>

        {/* Title and Description */}
        <header className="mb-8 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <BarChart2 size={24} />
            </div>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Survey Results
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            {survey.title}
          </h1>
          {survey.description && (
            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-850">
              <ReactMarkdown>{survey.description}</ReactMarkdown>
            </div>
          )}
        </header>

        {/* Questions Summary */}
        <div className="grid gap-6">
          {survey.questions.map((q: any, index: number) => (
            <div
              key={q.id || index}
              className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow transition duration-200"
            >
              {/* Question Header */}
              <div className="flex justify-between items-start gap-4 mb-4 pb-3 border-b border-gray-100 dark:border-gray-850">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 font-mono">
                    Q{index + 1}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-md border border-indigo-100/50 dark:border-indigo-900/20 capitalize">
                    {q.questionType.replace("-", " ")}
                  </span>
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {q.title}
              </h2>

              {/* Open Question */}
              {q.questionType === "open-ended" && (
                <div className="mt-4">
                  {q.summary ? (
                    <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2">
                      {q.summary.split(", ").map((resp: string, idx: number) => (
                        <div key={idx} className="flex gap-2.5 items-start text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3 rounded-lg shadow-2xs">
                          <MessageSquare size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                          <p>{resp}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="dark:text-gray-400 text-gray-500 italic">No responses received yet.</p>
                  )}
                </div>
              )}

              {/* Multiple Choice */}
              {q.questionType === "multiple-choice" && q.result && (
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={q.result.map((opt: any) => ({ name: opt.option, value: opt.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {q.result.map((entry: any, idx: number) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          borderRadius: "8px",
                          border: "none",
                          color: "#fff"
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Binary Choice */}
              {q.questionType === "binary-choice" && (
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Yes", value: q.yesCount },
                          { name: "No", value: q.noCount }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {[0, 1].map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          borderRadius: "8px",
                          border: "none",
                          color: "#fff"
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Likert Scale */}
              {q.questionType === "likert-scale" && q.result && (
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={q.result.map((row: any) => ({ scale: `Rating ${row.options}`, count: row.count }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                      <XAxis dataKey="scale" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          borderRadius: "8px",
                          border: "none",
                          color: "#fff"
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
