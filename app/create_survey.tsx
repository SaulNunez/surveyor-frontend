import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function SurveyCreate() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descTab, setDescTab] = useState("edit");
  const [questions, setQuestions] = useState([]);

  const addQuestion = (type) => {
    const newQuestion = { id: Date.now().toString(), type, text: "", options: [] };
    if (type === "likert") {
      newQuestion.negativeLabel = "";
      newQuestion.positiveLabel = "";
    }
    if (type === "binary") {
      newQuestion.negativeLabel = "";
      newQuestion.positiveLabel = "";
    }
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, field: string, value: string) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const addOption = (id) => {
    setQuestions(
      questions.map((q) =>
        q.id === id
          ? { ...q, options: [...q.options, { label: "" }] }
          : q
      )
    );
  };

  const updateOption = (qId, index, value) => {
    setQuestions(
      questions.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.map((opt, i) =>
                i === index ? { ...opt, label: value } : opt
              ),
            }
          : q
      )
    );
  };

  const removeQuestion = (id:string) => {
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
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Create Survey</h1>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Survey Title"
          className="w-full p-2 border rounded-lg mb-4"
        />

        {/* Tabs for Description */}
        <div className="mb-4">
          <div className="flex border-b mb-2">
            <button
              onClick={() => setDescTab("edit")}
              className={`px-4 py-2 ${
                descTab === "edit" ? "border-b-2 border-blue-600" : ""
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setDescTab("preview")}
              className={`px-4 py-2 ${
                descTab === "preview" ? "border-b-2 border-blue-600" : ""
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
            <div className="p-4 bg-white rounded-2xl shadow prose max-w-none text-gray-700">
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
                      className="p-6 bg-white rounded-2xl shadow relative"
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
                          value={q.text}
                          onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                          placeholder="Question Title"
                          className="w-full p-2 border rounded-lg mb-3"
                        />
                      </div>

                      {/* Multiple Choice */}
                      {q.type === "multiple" && (
                        <div>
                          {q.options.map((opt, idx) => (
                            <input
                              key={idx}
                              type="text"
                              value={opt.label}
                              onChange={(e) => updateOption(q.id, idx, e.target.value)}
                              placeholder={`Option ${idx + 1}`}
                              className="w-full p-2 border rounded-lg mb-2"
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
                      {q.type === "likert" && (
                        <div className="flex gap-4">
                          <input
                            type="text"
                            value={q.negativeLabel}
                            onChange={(e) => updateQuestion(q.id, "negativeLabel", e.target.value)}
                            placeholder="Negative label (1)"
                            className="flex-1 p-2 border rounded-lg"
                          />
                          <input
                            type="text"
                            value={q.positiveLabel}
                            onChange={(e) => updateQuestion(q.id, "positiveLabel", e.target.value)}
                            placeholder="Positive label (5)"
                            className="flex-1 p-2 border rounded-lg"
                          />
                        </div>
                      )}

                      {/* Binary */}
                      {q.type === "binary" && (
                        <div className="flex gap-4">
                          <input
                            type="text"
                            value={q.negativeLabel}
                            onChange={(e) => updateQuestion(q.id, "negativeLabel", e.target.value)}
                            placeholder="Negative label"
                            className="flex-1 p-2 border rounded-lg"
                          />
                          <input
                            type="text"
                            value={q.positiveLabel}
                            onChange={(e) => updateQuestion(q.id, "positiveLabel", e.target.value)}
                            placeholder="Positive label"
                            className="flex-1 p-2 border rounded-lg"
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
          onClick={() => addQuestion("open")}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          + Add Open Question
        </button>
        <button
          onClick={() => addQuestion("multiple")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Multiple Choice
        </button>
        <button
          onClick={() => addQuestion("binary")}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + Add Binary Question
        </button>
        <button
          onClick={() => addQuestion("likert")}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          + Add Likert Scale
        </button>
      </div>
    </div>
  );
}
