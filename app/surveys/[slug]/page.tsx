import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function SurveyAnswer({ survey }) {
  const [responses, setResponses] = useState({});

  const handleResponse = (id, value) => {
    setResponses({ ...responses, [id]: value });
  };

  const handleSubmit = () => {
    console.log("Survey responses:", responses);
    alert("Survey submitted! Check console for responses.");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-gray-900 dark:text-gray-100">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{survey.title}</h1>
        {survey.description && (
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <ReactMarkdown>{survey.description}</ReactMarkdown>
          </div>
        )}
      </header>

      <div className="grid gap-6 mb-6">
        {survey.questions.map((q) => (
          <div
            key={q.id}
            className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow"
          >
            <h2 className="text-lg font-semibold mb-3">{q.text}</h2>

            {/* Open Question */}
            {q.type === "open" && (
              <textarea
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="Your answer..."
                value={responses[q.id] || ""}
                onChange={(e) => handleResponse(q.id, e.target.value)}
              />
            )}

            {/* Multiple Choice */}
            {q.type === "multiple" && (
              <div className="space-y-2">
                {q.options.map((opt, idx) => (
                  <label key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={responses[q.id] === opt}
                      onChange={() => handleResponse(q.id, opt)}
                      className="text-blue-600 dark:text-blue-400"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Binary Choice */}
            {q.type === "binary" && (
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={q.id}
                    value="negative"
                    checked={responses[q.id] === "negative"}
                    onChange={() => handleResponse(q.id, "negative")}
                  />
                  <span>{q.negativeLabel}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={q.id}
                    value="positive"
                    checked={responses[q.id] === "positive"}
                    onChange={() => handleResponse(q.id, "positive")}
                  />
                  <span>{q.positiveLabel}</span>
                </label>
              </div>
            )}

            {/* Likert Scale */}
            {q.type === "likert" && (
              <div>
                <div className="flex justify-between mb-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{q.negativeLabel}</span>
                  <span>{q.positiveLabel}</span>
                </div>
                <div className="flex justify-between">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <label key={num} className="flex flex-col items-center">
                      <input
                        type="radio"
                        name={q.id}
                        value={num}
                        checked={responses[q.id] === num}
                        onChange={() => handleResponse(q.id, num)}
                      />
                      <span>{num}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Submit Survey
      </button>
    </div>
  );
}
