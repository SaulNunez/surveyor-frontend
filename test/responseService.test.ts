import { addResponseToQuestion, getExistingResponseInQuestion, updateResponseToQuestion } from "../libs/services/responseService";
import { NotFoundError } from "../libs/models/Errors/notFoundError";
import * as responseRepository from "../libs/repositories/responseRepository";
import * as questionRepository from "../libs/repositories/questionRepository";

jest.mock("../libs/repositories/responseRepository");
jest.mock("../libs/repositories/questionRepository");

describe("responseService", () => {
  const attemptId = "attempt-id";
  const questionId = "question-id";
  const surveyId = "survey-id";
  const responseId = "response-id";

  const mockGetQuestionById = questionRepository.getQuestionById as jest.Mock;
  const mockCreateResponse = responseRepository.createResponse as jest.Mock;
  const mockGetResponseForQuestion = responseRepository.getResponseForQuestion as jest.Mock;
  const mockEditResponse = responseRepository.editResponse as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addResponseToQuestion", () => {
    it("should throw NotFoundError if question does not exist", async () => {
      mockGetQuestionById.mockResolvedValue(null);
      await expect(addResponseToQuestion(attemptId, questionId, surveyId, {} as any)).rejects.toThrow(NotFoundError);
    });

    it("should throw Error if response question type does not match question type", async () => {
      mockGetQuestionById.mockResolvedValue({ _id: questionId, questionType: "open-ended" });
      await expect(addResponseToQuestion(attemptId, questionId, surveyId, { questionType: "multiple-choice" } as any)).rejects.toThrow("Response question type does not match the question type");
    });

    it("should add open-ended response", async () => {
      mockGetQuestionById.mockResolvedValue({ _id: questionId, questionType: "open-ended" });

      await addResponseToQuestion(attemptId, questionId, surveyId, { questionType: "open-ended", response: "answer" } as any);

      expect(mockCreateResponse).toHaveBeenCalledWith(attemptId, {
        question: questionId,
        response: "answer"
      });
    });

    it("should add likert-scale response", async () => {
      mockGetQuestionById.mockResolvedValue({ _id: questionId, questionType: "likert-scale" });

      await addResponseToQuestion(attemptId, questionId, surveyId, { questionType: "likert-scale", selectedValue: 3 } as any);

      expect(mockCreateResponse).toHaveBeenCalledWith(attemptId, {
        question: questionId,
        rating: 3
      });
    });

    it("should throw Error for invalid likert-scale value", async () => {
      mockGetQuestionById.mockResolvedValue({ _id: questionId, questionType: "likert-scale" });

      await expect(addResponseToQuestion(attemptId, questionId, surveyId, { questionType: "likert-scale", selectedValue: 6 } as any)).rejects.toThrow("Selected value must be between 1 and 5");
    });

    it("should add multiple-choice response", async () => {
      mockGetQuestionById.mockResolvedValue({ _id: questionId, questionType: "multiple-choice" });

      await addResponseToQuestion(attemptId, questionId, surveyId, { questionType: "multiple-choice", selectedOptionIndex: 1 } as any);

      expect(mockCreateResponse).toHaveBeenCalledWith(attemptId, {
        question: questionId,
        selectedOption: 1
      });
    });

    it("should add binary-choice response", async () => {
      mockGetQuestionById.mockResolvedValue({ _id: questionId, questionType: "binary-choice" });

      await addResponseToQuestion(attemptId, questionId, surveyId, { questionType: "binary-choice", selectedOption: "positive" } as any);

      expect(mockCreateResponse).toHaveBeenCalledWith(attemptId, {
        question: questionId,
        choice: true
      });
    });

    it("should throw Error for unsupported question type", async () => {
      mockGetQuestionById.mockResolvedValue({ _id: questionId, questionType: "unknown" });
      await expect(addResponseToQuestion(attemptId, questionId, surveyId, { questionType: "unknown" } as any)).rejects.toThrow("Unsupported question type");
    });
  });

  describe("getExistingResponseInQuestion", () => {
    it("should throw NotFoundError if response not found", async () => {
      mockGetResponseForQuestion.mockResolvedValue(null);
      await expect(getExistingResponseInQuestion(attemptId, questionId)).rejects.toThrow(NotFoundError);
    });

    it("should return open-ended response", async () => {
      mockGetResponseForQuestion.mockResolvedValue({ responseType: "open-ended", response: "test" });
      const result = await getExistingResponseInQuestion(attemptId, questionId);
      expect(result).toEqual({ questionType: "open-ended", response: "test" });
    });

    it("should return likert-scale response", async () => {
      mockGetResponseForQuestion.mockResolvedValue({ responseType: "likert-scale", rating: 4 });
      const result = await getExistingResponseInQuestion(attemptId, questionId);
      expect(result).toEqual({ questionType: "likert-scale", selectedValue: 4 });
    });

    it("should return multiple-choice response", async () => {
      mockGetResponseForQuestion.mockResolvedValue({ responseType: "multiple-choice", selectedOption: 2 });
      const result = await getExistingResponseInQuestion(attemptId, questionId);
      expect(result).toEqual({ questionType: "multiple-choice", selectedOptionIndex: 2 });
    });

    it("should return binary-choice response", async () => {
      mockGetResponseForQuestion.mockResolvedValue({ responseType: "binary-choice", choice: true });
      const result = await getExistingResponseInQuestion(attemptId, questionId);
      expect(result).toEqual({ questionType: "binary-choice", selectedOption: "positive" });
    });

    it("should throw Error for unsupported response type", async () => {
      mockGetResponseForQuestion.mockResolvedValue({ responseType: "unknown" });
      await expect(getExistingResponseInQuestion(attemptId, questionId)).rejects.toThrow("Unsupported response type");
    });
  });

  describe("updateResponseToQuestion", () => {
    it("should update open-ended response", async () => {
      await updateResponseToQuestion(attemptId, responseId, questionId, { questionType: "open-ended", response: "new" } as any);
      expect(mockEditResponse).toHaveBeenCalledWith(attemptId, responseId, {
        question: questionId,
        response: "new"
      });
    });

    it("should update multiple-choice response", async () => {
      await updateResponseToQuestion(attemptId, responseId, questionId, { questionType: "multiple-choice", selectedOptionIndex: 1 } as any);
      expect(mockEditResponse).toHaveBeenCalledWith(attemptId, responseId, {
        question: questionId,
        selectedOption: 1
      });
    });

    it("should update binary-choice response", async () => {
      await updateResponseToQuestion(attemptId, responseId, questionId, { questionType: "binary-choice", selectedOption: "positive" } as any);
      expect(mockEditResponse).toHaveBeenCalledWith(attemptId, responseId, {
        question: questionId,
        choice: true
      });
    });

    it("should update likert-scale response", async () => {
      await updateResponseToQuestion(attemptId, responseId, questionId, { questionType: "likert-scale", selectedValue: 5 } as any);
      expect(mockEditResponse).toHaveBeenCalledWith(attemptId, responseId, {
        question: questionId,
        rating: 5
      });
    });

    it("should throw Error for invalid likert-scale update", async () => {
      await expect(updateResponseToQuestion(attemptId, responseId, questionId, { questionType: "likert-scale", selectedValue: 6 } as any)).rejects.toThrow("Rating must be between 1 and 5");
    });
  });
});