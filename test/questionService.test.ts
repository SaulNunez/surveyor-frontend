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
      mockCreateQuestion.mockResolvedValue("new-id");
      const input = { questionType: "multiple-choice", title: "MCQ", options: ["A", "B"] };
      const result = await createQuestion(surveyId, input as any);

      expect(result.isOk()).toBe(true);
      expect(mockCreateQuestion).toHaveBeenCalledWith(surveyId, {
        questionType: QuestionType.MULTIPLE_CHOICE,
        text: "MCQ",
        options: ["A", "B"]
      });
    });

    it("should create binary-choice question", async () => {
      mockCreateQuestion.mockResolvedValue("new-id");
      const input = { questionType: "binary-choice", title: "Binary", positiveLabel: "Yes", negativeLabel: "No" };
      const result = await createQuestion(surveyId, input as any);

      expect(result.isOk()).toBe(true);
      expect(mockCreateQuestion).toHaveBeenCalledWith(surveyId, {
        questionType: QuestionType.BINARY_CHOICE,
        text: "Binary",
        positiveLabel: "Yes",
        negativeLabel: "No"
      });
    });

    it("should create likert-scale question", async () => {
      mockCreateQuestion.mockResolvedValue("new-id");
      const input = { questionType: "likert-scale", title: "Likert", positiveLabel: "Good", negativeLabel: "Bad" };
      const result = await createQuestion(surveyId, input as any);

      expect(result.isOk()).toBe(true);
      expect(mockCreateQuestion).toHaveBeenCalledWith(surveyId, {
        questionType: QuestionType.LIKERT_SCALE,
        text: "Likert",
        positiveLabel: "Good",
        negativeLabel: "Bad"
      });
    });

    it("should create open-ended question", async () => {
      mockCreateQuestion.mockResolvedValue("new-id");
      const input = { questionType: "open-ended", title: "Open" };
      const result = await createQuestion(surveyId, input as any);

      expect(result.isOk()).toBe(true);
      expect(mockCreateQuestion).toHaveBeenCalledWith(surveyId, {
        questionType: QuestionType.OPEN_ENDED,
        text: "Open"
      });
    });

    it("should return Error for invalid question type", async () => {
      const input = { questionType: "invalid", title: "Test" };
      const result = await createQuestion(surveyId, input as any);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Invalid question type");
    });
  });

  describe("getQuestionsForSurvey", () => {
    it("should return Error if survey not found", async () => {
      mockGetSurveyById.mockResolvedValue(null);
      const result = await getQuestionsForSurvey(surveyId);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Survey not found");
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

      expect(result.isOk()).toBe(true);
      const questions = result._unsafeUnwrap();
      expect(questions).toHaveLength(4);
      expect(questions[0]).toEqual({ id: "1", questionType: "binary-choice", title: "Binary", positiveLabel: "Y", negativeLabel: "N" });
      expect(questions[1]).toEqual({ id: "2", questionType: "likert-scale", title: "Likert", positiveLabel: "G", negativeLabel: "B" });
      expect(questions[2]).toEqual({ id: "3", questionType: "multiple-choice", title: "MCQ", options: ["1", "2"] });
      expect(questions[3]).toEqual({ id: "4", questionType: "open-ended", title: "Open" });
    });

    it("should return null (filtered out) for unsupported question type in DB", async () => {
      mockGetSurveyById.mockResolvedValue({
        questions: [{ _id: "5", questionType: "unknown" }]
      });
      const result = await getQuestionsForSurvey(surveyId);
      expect(result.isOk()).toBe(true);
      // Logic filters nulls, so array should be empty
      expect(result._unsafeUnwrap()).toEqual([]);
    });
  });

  describe("editQuestion", () => {
    it("should return Error if question not found", async () => {
      mockGetQuestionById.mockResolvedValue(null);
      const result = await editQuestion(surveyId, questionId, {} as any);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Question not found");
    });

    it("should edit multiple-choice question", async () => {
      const mockQ = { questionType: QuestionType.MULTIPLE_CHOICE, text: "Old", options: ["A"] };
      mockGetQuestionById.mockResolvedValue(mockQ);
      mockUpdateQuestion.mockResolvedValue(true);

      const input = { questionType: "multiple-choice", title: "New Title", options: ["C"] };
      const result = await editQuestion(surveyId, questionId, input as any);

      expect(result.isOk()).toBe(true);
      expect(mockQ.text).toBe("New Title");
      expect(mockQ.options).toEqual(["C"]);
      expect(mockUpdateQuestion).toHaveBeenCalledWith(surveyId, questionId, mockQ);
    });

    it("should edit binary-choice question", async () => {
      const mockQ = { questionType: QuestionType.BINARY_CHOICE, text: "Old", positiveLabel: "Y", negativeLabel: "N" };
      mockGetQuestionById.mockResolvedValue(mockQ);
      mockUpdateQuestion.mockResolvedValue(true);

      const input = { questionType: "binary-choice", title: "New Title", positiveLabel: "Y", negativeLabel: "N" };
      const result = await editQuestion(surveyId, questionId, input as any);

      expect(result.isOk()).toBe(true);
      expect(mockQ.text).toBe("New Title");
      expect(mockQ.positiveLabel).toBe("Y");
      expect(mockUpdateQuestion).toHaveBeenCalledWith(surveyId, questionId, mockQ);
    });

    it("should edit likert-scale question", async () => {
      const mockQ = { questionType: QuestionType.LIKERT_SCALE, text: "Old", positiveLabel: "G", negativeLabel: "B" };
      mockGetQuestionById.mockResolvedValue(mockQ);
      mockUpdateQuestion.mockResolvedValue(true);

      const input = { questionType: "likert-scale", title: "New Title", positiveLabel: "G", negativeLabel: "B" };
      const result = await editQuestion(surveyId, questionId, input as any);

      expect(result.isOk()).toBe(true);
      expect(mockQ.text).toBe("New Title");
      expect(mockQ.positiveLabel).toBe("G");
      expect(mockUpdateQuestion).toHaveBeenCalledWith(surveyId, questionId, mockQ);
    });

    it("should edit open-ended question", async () => {
      const mockQ = { questionType: QuestionType.OPEN_ENDED, text: "Old" };
      mockGetQuestionById.mockResolvedValue(mockQ);
      mockUpdateQuestion.mockResolvedValue(true);

      const input = { questionType: "open-ended", title: "New Title" };
      const result = await editQuestion(surveyId, questionId, input as any);

      expect(result.isOk()).toBe(true);
      expect(mockQ.text).toBe("New Title");
      expect(mockUpdateQuestion).toHaveBeenCalledWith(surveyId, questionId, mockQ);
    });

    it("should return Error if question type mismatch", async () => {
      const mockQ = { questionType: QuestionType.OPEN_ENDED };
      mockGetQuestionById.mockResolvedValue(mockQ);

      const input = { questionType: "multiple-choice" };
      const result = await editQuestion(surveyId, questionId, input as any);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe("Question type cannot be changed");
    });
  });

  describe("deleteQuestion", () => {
    it("should delete question", async () => {
      mockDeleteQuestion.mockResolvedValue(true);
      const result = await deleteQuestion(surveyId, questionId);
      expect(result.isOk()).toBe(true);
      expect(mockDeleteQuestion).toHaveBeenCalledWith(questionId, surveyId);
    });
  });
});