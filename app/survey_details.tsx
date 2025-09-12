import React from "react";
import ReactMarkdown from "react-markdown";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

// Example survey data structure
// const survey = {
//   title: "Customer Feedback",
//   description: "## Thank you for your feedback!\nWe appreciate your time.",
//   questions: [
//     { id: 1, type: "open", text: "What do you think about our service?" },
//     { id: 2, type: "multiple", text: "Which features do you use?", options: [{ label: "Feature A", count: 10 }, { label: "Feature B", count: 5 }] },
//     { id: 3, type: "binary", text: "Would you recommend us?", options: [{ label: "Yes", count: 8 }, { label: "No", count: 2 }] },
//     { id: 4, type: "likert", text: "Rate your satisfaction (1-5)", responses: { 1: 1, 2: 3, 3: 5, 4: 8, 5: 4 } }
//   ]
// };

export default function SurveyDetails() {
  const survey = {
   title: "Customer Feedback",
   description: "## Thank you for your feedback!\nWe appreciate your time.",
   questions: [
     { id: 1, type: "open", text: "What do you think about our service?" },
     { id: 2, type: "multiple", text: "Which features do you use?", options: [{ label: "Feature A", count: 10 }, { label: "Feature B", count: 5 }] },
     { id: 3, type: "binary", text: "Would you recommend us?", options: [{ label: "Yes", count: 8 }, { label: "No", count: 2 }] },
     { id: 4, type: "likert", text: "Rate your satisfaction (1-5)", responses: { 1: 1, 2: 3, 3: 5, 4: 8, 5: 4 } }
   ]
 };
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Title and Description */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{survey.title}</h1>
        <div className="prose max-w-none text-gray-700">
          <ReactMarkdown>{survey.description}</ReactMarkdown>
        </div>
      </header>

      {/* Questions */}
      <div className="grid gap-6">
        {survey.questions.map((q) => (
          <div
            key={q.id}
            className="p-4 bg-white rounded-2xl shadow hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              {q.text}
            </h2>

            {/* Open Question */}
            {q.type === "open" && (
              <p className="text-gray-500 italic">Open question — no stats available.</p>
            )}

            {/* Multiple Choice / Binary */}
            {(q.type === "multiple" || q.type === "binary") && (
              <ul className="space-y-1">
                {q.options.map((opt, idx) => (
                  <li key={idx} className="flex justify-between text-gray-700">
                    <span>{opt.label}</span>
                    <span className="font-medium">{opt.count}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Likert Scale */}
            {q.type === "likert" && (
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(q.responses).map(([key, value]) => ({ scale: key, count: value }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="scale" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
