"use client"

import { useState } from "react";

// Example usage:
// <Dashboard />

export default function Dashboard() {
  const [userName, setUserName] = useState("Joe Doe");
  const [surveys, setSurveys] = useState([
    { id: 1, name: "Customer Feedback", createdAt: "2025-09-01" },
    { id: 2, name: "Product Satisfaction", createdAt: "2025-09-05" },
  ]);

  const handleCreateSurvey = () => {
    const newSurvey = {
      id: surveys.length + 1,
      name: `New Survey ${surveys.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    setSurveys([...surveys, newSurvey]);
  };

  const handleViewSurvey = (surveyId) => {
    alert(`Viewing survey with ID: ${surveyId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">
          Good morning {userName}
        </h1>
        <button
          onClick={handleCreateSurvey}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
        >
          + Create Survey
        </button>
      </header>

      {/* Survey List */}
      <div className="grid gap-4">
        {surveys.length > 0 ? (
          surveys.map((survey) => (
            <div
              key={survey.id}
              className="p-4 bg-white rounded-2xl shadow hover:shadow-md transition flex items-center justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-700">
                  {survey.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Created on: {new Date(survey.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleViewSurvey(survey.id)}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                View Survey
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No surveys available.</p>
        )}
      </div>
    </div>
  );
}
