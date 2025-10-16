"use client"

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { QuestionDao } from "@/libs/models/frontend/question";
import { v7 as uuidv7 } from 'uuid';
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { SurveyInput } from "@/libs/models/frontend/survey";

type QuestionDaoInScreen = QuestionDao & { id: string };

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
    surveyMutation.mutate({ title, description, questions }, {
      onSuccess: (data, variables, onMutateResult, context) => {
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
        questionType: 'likert-scale',
        negativeLabel: "",
        positiveLabel: "",
        id: uuidv7()
      };
    }
    else if (type === "multiple-choice") {
      newQuestion = {
        title: "",
        questionType: 'multiple-choice',
        options: [],
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
          ? { ...q, options: [...q.options,] }
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
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-black">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Create Survey</h1>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Survey Title"
          className="w-full p-2 border rounded-lg mb-4 block mb-2 text-md font-medium text-gray-900 dark:text-white"
        />

        {/* Tabs for Description */}
        <div className="mb-4">
          <div className="flex border-b mb-2">
            <button
              onClick={() => setDescTab("edit")}
              className={`px-4 py-2 ${descTab === "edit" ? "border-b-2 border-blue-600" : ""
                }`}
            >
              Edit
            </button>
            <button
              onClick={() => setDescTab("preview")}
              className={`px-4 py-2 ${descTab === "preview" ? "border-b-2 border-blue-600" : ""
                }`}
            >
              Preview
            </button>
          </div>
          {descTab === "edit" && (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Survey Description (Markdown supported)"
              className="w-full p-2 border rounded-lg h-32"
            />
          )}
          {descTab === "preview" && description && (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow prose max-w-none text-gray-700 dark:text-gray-400">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          )}
        </div>
      </header>

      {/* Questions with Drag and Drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="questions">
          {(provided) => (
            <div
              className="grid gap-6 mb-6"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {questions.map((q, index) => (
                <Draggable key={q.id} draggableId={q.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow relative"
                    >
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button
                          onClick={() => moveQuestion(index, "up")}
                          disabled={index === 0}
                          className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowUp size={20} />
                        </button>
                        <button
                          onClick={() => moveQuestion(index, "down")}
                          disabled={index === questions.length - 1}
                          className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowDown size={20} />
                        </button>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>

                      <div className="pt-8">
                        <input
                          type="text"
                          value={q.title}
                          onChange={(e) => updateQuestion(q.id, "title", e.target.value)}
                          placeholder="Question Title"
                          className="w-full p-2 border rounded-lg mb-4 block mb-2 text-md font-medium text-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Multiple Choice */}
                      {q.questionType === "multiple-choice" && (
                        <div>
                          {q.options.map((opt, idx) => (
                            <input
                              key={idx}
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(q.id, idx, e.target.value)}
                              placeholder={`Option ${idx + 1}`}
                              className="w-full p-2 border rounded-lg mb-4 block mb-2 text-md font-medium text-gray-900 dark:text-white"
                            />
                          ))}
                          <button
                            onClick={() => addOption(q.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            + Add Option
                          </button>
                        </div>
                      )}

                      {/* Likert */}
                      {q.questionType === "likert-scale" && (
                        <div className="flex gap-4">
                          <input
                            type="text"
                            value={q.negativeLabel}
                            onChange={(e) => updateQuestion(q.id, "negativeLabel", e.target.value)}
                            placeholder="Negative label (1)"
                            className="flex-1 w-full p-2 border rounded-lg mb-4 block mb-2 text-md font-medium text-gray-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={q.positiveLabel}
                            onChange={(e) => updateQuestion(q.id, "positiveLabel", e.target.value)}
                            placeholder="Positive label (5)"
                            className="flex-1 p-2 border rounded-lg w-full p-2 border rounded-lg mb-4 block mb-2 text-md font-medium text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      {/* Binary */}
                      {q.questionType === "binary-choice" && (
                        <div className="flex gap-4">
                          <input
                            type="text"
                            value={q.negativeLabel}
                            onChange={(e) => updateQuestion(q.id, "negativeLabel", e.target.value)}
                            placeholder="Negative label"
                            className="flex-1 p-2 border rounded-lg w-full p-2 border rounded-lg mb-4 block mb-2 text-md font-medium text-gray-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={q.positiveLabel}
                            onChange={(e) => updateQuestion(q.id, "positiveLabel", e.target.value)}
                            placeholder="Positive label"
                            className="flex-1 p-2 border rounded-lg w-full p-2 border rounded-lg mb-4 block mb-2 text-md font-medium text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      {/* Open has no extra inputs */}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Question Button */}
      <div className="space-x-2">
        <button
          onClick={() => addQuestion("open-ended")}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          + Add Open Question
        </button>
        <button
          onClick={() => addQuestion("multiple-choice")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Multiple Choice
        </button>
        <button
          onClick={() => addQuestion("binary-choice")}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + Add Binary Question
        </button>
        <button
          onClick={() => addQuestion("likert-scale")}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          + Add Likert Scale
        </button>
      </div>
      <div>
        <button
          onClick={() => submitSurvey()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Submit survey
        </button>
      </div>
    </div>
  );
}
