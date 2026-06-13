import { getAllSurveysForUser } from "@/libs/services/surveyService";
import Link from "next/link";
import { auth } from "@/auth";
import { Plus, Calendar, ArrowRight, FileText } from "lucide-react";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 text-center max-w-sm">
          <p className="text-gray-700 dark:text-zinc-300 font-medium mb-4">User not logged in.</p>
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  let surveysResult: Awaited<ReturnType<typeof getAllSurveysForUser>> = [];
  let errorMsg = "";

  try {
    surveysResult = await getAllSurveysForUser(session.user.id);
  } catch (err: any) {
    errorMsg = err.message || "Failed to load surveys";
  }

  // Get current hour to show appropriate greeting
  const hour = new Date().getHours();
  let greeting = "Welcome back";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {greeting}, {session?.user?.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Manage your active surveys and analyze responses.
            </p>
          </div>
          {surveysResult.length > 0 && (
            <Link
              href="/surveys/create"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-xs transition active:scale-[0.98]"
            >
              <Plus size={16} /> Create Survey
            </Link>
          )}
        </header>

        {/* Error State */}
        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl mb-6 text-sm font-medium">
            Error loading surveys: {errorMsg}
          </div>
        )}

        {/* Survey List / Empty State */}
        {!errorMsg && (
          surveysResult.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {surveysResult.map((survey) => (
                <div
                  key={survey.id}
                  className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200 group"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {survey.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 line-clamp-2 min-h-[2.5rem]">
                      {survey.description || "No description provided."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-850">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500">
                      <Calendar size={14} />
                      <span>{new Date(survey.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <Link
                      href={`/surveys/${survey.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-xs font-bold rounded-lg border border-gray-250/60 dark:border-zinc-700/80 transition"
                    >
                      View <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 border-2 border-dashed border-gray-250 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/50 max-w-lg mx-auto shadow-xs">
              <div className="inline-flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-2xl mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No surveys found</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
                Start by creating your first survey to collect feedback, structure questions, and analyze responses.
              </p>
              <Link
                href="/surveys/create"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition active:scale-[0.98]"
              >
                <Plus size={16} /> Create Your First Survey
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  );
}

