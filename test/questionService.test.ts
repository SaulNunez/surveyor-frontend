import { createQuestion, getQuestionsForSurvey, editQuestion, deleteQuestion } from "../libs/services/questionService";
import * as questionRepository from "../libs/repositories/questionRepository";
import * as surveyRepository from "../libs/repositories/surveyRepository";
import { QuestionType } from "../libs/models/questionSchema";

jest.mock("../libs/repositories/questionRepository");
jest.mock("../libs/repositories/surveyRepository");

describe("questionService", () => {
  const surveyId = "survey-id";
  const questionId = "question-id";

  const mockCreateQuestion = questionRepository.createQuestion as jest.Mock;
  const mockGetQuestionById = questionRepository.getQuestionById as jest.Mock;
  const mockDeleteQuestion = questionRepository.deleteQuestion as jest.Mock;
  const mockUpdateQuestion = questionRepository.updateQuestion as jest.Mock;
  const mockGetSurveyById = surveyRepository.getSurveyById as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createQuestion", () => {
    it("should create multiple-choice question", async () => {
      const input = { questionType: "multiple-choice", title: "MCQ", options: ["A", "B"] };
      await createQuestion(surveyId, input as any);

      expect(mockCreateQuestion).toHaveBeenCalledWith(surveyId, {
        questionType: QuestionType.MULTIPLE_CHOICE,
        text: "MCQ",
        options: ["A", "B"]
      });
    });

    it("should create binary-choice question", async () => {
      const input = { questionType: "binary-choice", title: "Binary", positiveLabel: "Yes", negativeLabel: "No" };
      await createQuestion(surveyId, input as any);

      expect(mockCreateQuestion).toHaveBeenCalledWith(surveyId, {
        questionType: QuestionType.BINARY_CHOICE,
        text: "Binary",
        positiveLabel: "Yes",
        negativeLabel: "No"
      });
    });

    it("should create likert-scale question", async () => {
      const input = { questionType: "likert-scale", title: "Likert", positiveLabel: "Good", negativeLabel: "Bad" };
      await createQuestion(surveyId, input as any);

      expect(mockCreateQuestion).toHaveBeenCalledWith(surveyId, {
        questionType: QuestionType.LIKERT_SCALE,
        text: "Likert",
        positiveLabel: "Good",
        negativeLabel: "Bad"
      });
    });

    it("should create open-ended question", async () => {
      const input = { questionType: "open-ended", title: "Open" };
      await createQuestion(surveyId, input as any);

      expect(mockCreateQuestion).toHaveBeenCalledWith(surveyId, {
        questionType: QuestionType.OPEN_ENDED,
        text: "Open"
      });
    });

    it("should throw Error for invalid question type", async () => {
      const input = { questionType: "invalid", title: "Test" };
      await expect(createQuestion(surveyId, input as any)).rejects.toThrow("Invalid question type");
    });
  });

  describe("getQuestionsForSurvey", () => {
    it("should throw Error if survey not found", async () => {
      mockGetSurveyById.mockResolvedValue(null);
      await expect(getQuestionsForSurvey(surveyId)).rejects.toThrow("Survey not found");
    });

    it("should return mapped questions", async () => {
      mockGetSurveyById.mockResolvedValue({
        questions: [
          { _id: "1", questionType: QuestionType.BINARY_CHOICE, text: "Binary", positiveLabel: "Y", negativeLabel: "N" },
          { _id: "2", questionType: QuestionType.LIKERT_SCALE, text: "Likert", positiveLabel: "G", negativeLabel: "B" },
          { _id: "3", questionType: QuestionType.MULTIPLE_CHOICE, text: "MCQ", options: ["1", "2"] },
          { _id: "4", questionType: QuestionType.OPEN_ENDED, text: "Open" }
        ]
      });

      const result = await getQuestionsForSurvey(surveyId);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ id: "1", questionType: "binary-choice", title: "Binary", positiveLabel: "Y", negativeLabel: "N" });
      expect(result[1]).toEqual({ id: "2", questionType: "likert-scale", title: "Likert", positiveLabel: "G", negativeLabel: "B" });
      expect(result[2]).toEqual({ id: "3", questionType: "multiple-choice", title: "MCQ", options: ["1", "2"] });
      expect(result[3]).toEqual({ id: "4", questionType: "open-ended", title: "Open" });
    });

    it("should return null for unsupported question type in DB", async () => {
      mockGetSurveyById.mockResolvedValue({
        questions: [{ _id: "5", questionType: "unknown" }]
      });
      const result = await getQuestionsForSurvey(surveyId);
      expect(result).toEqual([null]);
    });
  });

  describe("editQuestion", () => {
    it("should throw Error if question not found", async () => {
      mockGetQuestionById.mockResolvedValue(null);
      await expect(editQuestion(surveyId, questionId, {} as any)).rejects.toThrow("Question not found");
    });

    it("should edit multiple-choice question", async () => {
      const mockQ = { questionType: QuestionType.MULTIPLE_CHOICE, text: "Old", options: ["A"] };
      mockGetQuestionById.mockResolvedValue(mockQ);

      const input = { questionType: "multiple-choice", title: "New Title", options: ["C"] };
      await editQuestion(surveyId, questionId, input as any);

      expect(mockQ.text).toBe("New Title");
      expect(mockQ.options).toEqual(["C"]);
      expect(mockUpdateQuestion).toHaveBeenCalledWith(surveyId, questionId, mockQ);
    });

    it("should edit binary-choice question", async () => {
      const mockQ = { questionType: QuestionType.BINARY_CHOICE, text: "Old", positiveLabel: "Y", negativeLabel: "N" };
      mockGetQuestionById.mockResolvedValue(mockQ);

      const input = { questionType: "binary-choice", title: "New Title", positiveLabel: "Y", negativeLabel: "N" };
      await editQuestion(surveyId, questionId, input as any);

      expect(mockQ.text).toBe("New Title");
      expect(mockQ.positiveLabel).toBe("Y");
      expect(mockUpdateQuestion).toHaveBeenCalledWith(surveyId, questionId, mockQ);
    });

    it("should edit likert-scale question", async () => {
      const mockQ = { questionType: QuestionType.LIKERT_SCALE, text: "Old", positiveLabel: "G", negativeLabel: "B" };
      mockGetQuestionById.mockResolvedValue(mockQ);

      const input = { questionType: "likert-scale", title: "New Title", positiveLabel: "G", negativeLabel: "B" };
      await editQuestion(surveyId, questionId, input as any);

      expect(mockQ.text).toBe("New Title");
      expect(mockQ.positiveLabel).toBe("G");
      expect(mockUpdateQuestion).toHaveBeenCalledWith(surveyId, questionId, mockQ);
    });

    it("should edit open-ended question", async () => {
      const mockQ = { questionType: QuestionType.OPEN_ENDED, text: "Old" };
      mockGetQuestionById.mockResolvedValue(mockQ);

      const input = { questionType: "open-ended", title: "New Title" };
      await editQuestion(surveyId, questionId, input as any);

      expect(mockQ.text).toBe("New Title");
      expect(mockUpdateQuestion).toHaveBeenCalledWith(surveyId, questionId, mockQ);
    });

    it("should throw Error if question type mismatch", async () => {
      const mockQ = { questionType: QuestionType.OPEN_ENDED };
      mockGetQuestionById.mockResolvedValue(mockQ);

      const input = { questionType: "multiple-choice" };
      await expect(editQuestion(surveyId, questionId, input as any)).rejects.toThrow("Question type cannot be changed");
    });
  });

  describe("deleteQuestion", () => {
    it("should delete question", async () => {
      mockDeleteQuestion.mockResolvedValue(true);
      await deleteQuestion(surveyId, questionId);
      expect(mockDeleteQuestion).toHaveBeenCalledWith(questionId, surveyId);
    });
  });
});