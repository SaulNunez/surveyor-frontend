"use client"

import Link from "next/link";
import { useState } from "react";

// Example usage:
// <Dashboard />

export default function Dashboard() {
  const [userName, setUserName] = useState("Joe Doe");
  const [surveys, setSurveys] = useState([
    { id: 1, name: "Customer Feedback", createdAt: "2025-09-01" },
    { id: 2, name: "Product Satisfaction", createdAt: "2025-09-05" },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-black">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Good morning {userName}
        </h1>
        <Link
          href={"/surveys/create"}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
        >
          + Create Survey
        </Link>
      </header>

      {/* Survey List */}
      <div className="grid gap-4">
        {surveys.length > 0 ? (
          surveys.map((survey) => (
            <div
              key={survey.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow hover:shadow-md transition flex items-center justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-white">
                  {survey.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created on: {new Date(survey.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/surveys/${survey.id}`}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                View Survey
              </Link>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No surveys available.</p>
        )}
      </div>
    </div>
  );
}
