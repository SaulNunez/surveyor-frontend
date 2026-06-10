"use client"

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Sliders, 
  List, 
  MessageSquare, 
  ToggleLeft, 
  Loader2, 
  Send,
  Eye,
  Edit2
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { QuestionInput } from "@/libs/models/frontend/question";
import { v7 as uuidv7 } from 'uuid';
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { SurveyInput } from "@/libs/models/frontend/survey";

type QuestionDaoInScreen = QuestionInput & { id: string };

export default function SurveyCreate() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descTab, setDescTab] = useState("edit");
  const [questions, setQuestions] = useState<QuestionDaoInScreen[]>([]);

  const postSurvey = (survey: SurveyInput) => {
    return fetch('/api/surveys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(survey)
    }).then(response => {
      if (!response.ok) {
        throw new Error('HTTP error ' + response.status);
      }
      return response.json();
    });
  };

  const surveyMutation = useMutation({
    mutationFn: postSurvey,
    mutationKey: ['addSurvey']
  });

  const submitSurvey = async () => {
    if (!title.trim()) return;
    surveyMutation.mutate({ title, description, questions }, {
      onSuccess: (data) => {
        router.push(`/surveys/${data?.id}`);
      },
    })
  };

  const addQuestion = (type: string) => {
    let newQuestion: QuestionDaoInScreen;
    if (type === "likert-scale") {
      newQuestion = {
        title: "",
        questionType: 'likert-scale',
        negativeLabel: "",
        positiveLabel: "",
        id: uuidv7()
      };
    }
    else if (type === "binary-choice") {
      newQuestion = {
        title: "",
        questionType: 'binary-choice',
        negativeLabel: "",
        positiveLabel: "",
        id: uuidv7()
      };
    }
    else if (type === "multiple-choice") {
      newQuestion = {
        title: "",
        questionType: 'multiple-choice',
        options: ["Option 1", "Option 2"],
        id: uuidv7()
      };
    }
    else {
      newQuestion = {
        title: "",
        questionType: 'open-ended',
        id: uuidv7()
      };
    }
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, field: string, value: string) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId && q.questionType === "multiple-choice"
          ? { ...q, options: [...q.options, ""] }
          : q
      )
    );
  };

  const updateOption = (qId: string, index: number, updatedValue: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === qId && q.questionType === "multiple-choice"
          ? {
            ...q,
            options: q.options.map((originalOption, i) =>
              i === index ? updatedValue : originalOption
            ),
          }
          : q
      )
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    const [moved] = newQuestions.splice(index, 1);
    newQuestions.splice(targetIndex, 0, moved);
    setQuestions(newQuestions);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(questions);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setQuestions(reordered);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/60 dark:border-zinc-800/80 shadow-sm">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">Create Survey</h1>
          
          <div className="space-y-5">
            <div>
              <label htmlFor="survey-title" className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                Survey Title
              </label>
              <input
                id="survey-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title for your survey"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/80 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            {/* Tabs for Description */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300">
                  Survey Description <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">(Markdown supported)</span>
                </label>
                <div className="flex bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDescTab("edit")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                      descTab === "edit" 
                        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs" 
                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescTab("preview")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                      descTab === "preview" 
                        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs" 
                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Eye size={12} /> Preview
                  </button>
                </div>
              </div>
              {descTab === "edit" ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context, instructions, or goals for this survey..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/80 rounded-xl h-32 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-y"
                />
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/30 border border-gray-200 dark:border-zinc-800 rounded-xl min-h-[8rem] prose dark:prose-invert max-w-none text-gray-700 dark:text-zinc-300">
                  {description ? (
                    <ReactMarkdown>{description}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 dark:text-zinc-500 italic text-sm">Nothing to preview yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Questions Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Questions</h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded-full">
              {questions.length} {questions.length === 1 ? 'question' : 'questions'}
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-gray-250 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/50">
              <p className="text-gray-500 dark:text-zinc-400 font-medium mb-1">No questions added yet</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500">Choose a question type below to start building your survey.</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <div
                    className="space-y-4"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {questions.map((q, index) => (
                      <Draggable key={q.id} draggableId={q.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs overflow-hidden group hover:border-gray-300 dark:hover:border-zinc-700 transition"
                          >
                            {/* Drag Handle & Header Toolbar */}
                            <div className="bg-gray-50 dark:bg-zinc-900/50 px-5 py-2.5 border-b border-gray-100 dark:border-zinc-800/60 flex justify-between items-center">
                              <div className="flex items-center gap-2" {...provided.dragHandleProps}>
                                <div className="flex flex-col gap-0.5 cursor-grab active:cursor-grabbing text-gray-400 dark:text-zinc-500 p-1">
                                  <span className="block w-3.5 h-0.5 bg-current rounded-full"></span>
                                  <span className="block w-3.5 h-0.5 bg-current rounded-full"></span>
                                  <span className="block w-3.5 h-0.5 bg-current rounded-full"></span>
                                </div>
                                <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                                  Q{index + 1}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md border border-blue-100/50 dark:border-blue-800/20 capitalize">
                                  {q.questionType.replace("-", " ")}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveQuestion(index, "up")}
                                  disabled={index === 0}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none rounded-lg hover:bg-gray-150 dark:hover:bg-zinc-800 transition"
                                  title="Move Up"
                                >
                                  <ArrowUp size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveQuestion(index, "down")}
                                  disabled={index === questions.length - 1}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none rounded-lg hover:bg-gray-150 dark:hover:bg-zinc-800 transition"
                                  title="Move Down"
                                >
                                  <ArrowDown size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(q.id)}
                                  className="p-1 text-red-400 hover:text-red-600 dark:text-red-500/80 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                                  title="Remove Question"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="p-5 space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                  Question Title
                                </label>
                                <input
                                  type="text"
                                  value={q.title}
                                  onChange={(e) => updateQuestion(q.id, "title", e.target.value)}
                                  placeholder="What would you like to ask?"
                                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/80 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                />
                              </div>

                              {/* Multiple Choice */}
                              {q.questionType === "multiple-choice" && (
                                <div className="space-y-3 pt-1">
                                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Options
                                  </label>
                                  <div className="space-y-2.5">
                                    {q.options.map((opt, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-bold text-gray-400 dark:text-zinc-500 w-5 text-right">{idx + 1}.</span>
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => updateOption(q.id, idx, e.target.value)}
                                          placeholder={`Option ${idx + 1}`}
                                          className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-800/30 border border-gray-200 dark:border-zinc-700/60 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setQuestions(
                                              questions.map((question) =>
                                                question.id === q.id && question.questionType === "multiple-choice"
                                                  ? { ...question, options: question.options.filter((_, i) => i !== idx) }
                                                  : question
                                              )
                                            );
                                          }}
                                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                                          title="Remove option"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addOption(q.id)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1 transition"
                                  >
                                    <Plus size={14} /> Add Option
                                  </button>
                                </div>
                              )}

                              {/* Likert */}
                              {q.questionType === "likert-scale" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                                      Lowest Value Label (e.g. Strongly Disagree)
                                    </label>
                                    <input
                                      type="text"
                                      value={q.negativeLabel}
                                      onChange={(e) => updateQuestion(q.id, "negativeLabel", e.target.value)}
                                      placeholder="Negative label (1)"
                                      className="w-full px-3.5 py-2 bg-white dark:bg-zinc-800/30 border border-gray-200 dark:border-zinc-700/60 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                                      Highest Value Label (e.g. Strongly Agree)
                                    </label>
                                    <input
                                      type="text"
                                      value={q.positiveLabel}
                                      onChange={(e) => updateQuestion(q.id, "positiveLabel", e.target.value)}
                                      placeholder="Positive label (5)"
                                      className="w-full px-3.5 py-2 bg-white dark:bg-zinc-800/30 border border-gray-200 dark:border-zinc-700/60 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Binary */}
                              {q.questionType === "binary-choice" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                                      False/Negative Label (e.g. No)
                                    </label>
                                    <input
                                      type="text"
                                      value={q.negativeLabel}
                                      onChange={(e) => updateQuestion(q.id, "negativeLabel", e.target.value)}
                                      placeholder="Negative label"
                                      className="w-full px-3.5 py-2 bg-white dark:bg-zinc-800/30 border border-gray-200 dark:border-zinc-700/60 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                                      True/Positive Label (e.g. Yes)
                                    </label>
                                    <input
                                      type="text"
                                      value={q.positiveLabel}
                                      onChange={(e) => updateQuestion(q.id, "positiveLabel", e.target.value)}
                                      placeholder="Positive label"
                                      className="w-full px-3.5 py-2 bg-white dark:bg-zinc-800/30 border border-gray-200 dark:border-zinc-700/60 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* Add Question Controls (Secondary Action Group) */}
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-gray-250 dark:border-zinc-800/80 rounded-2xl p-6 text-center mb-8 shadow-xs">
          <h3 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
            Add a new question to your survey
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => addQuestion("open-ended")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-200 text-sm font-semibold rounded-xl transition"
            >
              <MessageSquare size={16} className="text-gray-500 dark:text-zinc-400" />
              Open Ended
            </button>
            <button
              type="button"
              onClick={() => addQuestion("multiple-choice")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-200 text-sm font-semibold rounded-xl transition"
            >
              <List size={16} className="text-gray-500 dark:text-zinc-400" />
              Multiple Choice
            </button>
            <button
              type="button"
              onClick={() => addQuestion("binary-choice")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-200 text-sm font-semibold rounded-xl transition"
            >
              <ToggleLeft size={16} className="text-gray-500 dark:text-zinc-400" />
              Binary Choice
            </button>
            <button
              type="button"
              onClick={() => addQuestion("likert-scale")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 text-gray-700 dark:text-zinc-200 text-sm font-semibold rounded-xl transition"
            >
              <Sliders size={16} className="text-gray-500 dark:text-zinc-400" />
              Likert Scale
            </button>
          </div>
        </div>

        {/* Primary Action Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <div className="text-left">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Ready to publish?</h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Please make sure you have added a title and configured your questions.</p>
          </div>
          <button
            type="button"
            onClick={submitSurvey}
            disabled={!title.trim() || surveyMutation.isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 disabled:pointer-events-none hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            {surveyMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Survey...
              </>
            ) : (
              <>
                <Send size={16} />
                Create Survey
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

