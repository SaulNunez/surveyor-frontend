import { addResponseToQuestion, getExistingResponseInQuestion, updateResponseToQuestion } from "../libs/services/responseService";
import { QuestionModel } from "../libs/models/questionSchema";
import { AttemptModel } from "../libs/models/attemptSchema";
import { NotFoundError } from "../libs/models/Errors/notFoundError";
import { InvalidOperationError } from "../libs/models/Errors/invalidOperationError";

jest.mock("../libs/models/questionSchema");
jest.mock("../libs/models/attemptSchema");

describe("responseService", () => {
  const attemptId = "attempt-id";
  const questionId = "question-id";
  const mockSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addResponseToQuestion", () => {
    it("should throw NotFoundError if question does not exist", async () => {
      jest.spyOn(QuestionModel, "findById").mockResolvedValue(null);
      await expect(addResponseToQuestion(attemptId, questionId, {} as any)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if attempt does not exist", async () => {
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(null);
      await expect(addResponseToQuestion(attemptId, questionId, {} as any)).rejects.toThrow(NotFoundError);
    });

    it("should throw InvalidOperationError if response already exists", async () => {
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue({
        _id: attemptId,
        responses: [{ question: questionId }],
      });
      await expect(addResponseToQuestion(attemptId, questionId, {} as any)).rejects.toThrow(InvalidOperationError);
    });

    it("should add open-ended response", async () => {
      const attempt = { _id: attemptId, responses: [], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await addResponseToQuestion(attemptId, questionId, { questionType: "open-ended", response: "answer" } as any);

      expect(attempt.responses).toHaveLength(1);
      expect(attempt.responses[0]).toMatchObject({ question: questionId, response: "answer" });
      expect(mockSave).toHaveBeenCalled();
    });

    it("should add likert-scale response", async () => {
      const attempt = { _id: attemptId, responses: [], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await addResponseToQuestion(attemptId, questionId, { questionType: "likert-scale", selectedValue: 3 } as any);

      expect(attempt.responses[0]).toMatchObject({ question: questionId, rating: 3 });
      expect(mockSave).toHaveBeenCalled();
    });

    it("should throw Error for invalid likert-scale value", async () => {
      const attempt = { _id: attemptId, responses: [], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await expect(addResponseToQuestion(attemptId, questionId, { questionType: "likert-scale", selectedValue: 6 } as any)).rejects.toThrow("Selected value must be between 1 and 5");
    });

    it("should add multiple-choice response", async () => {
      const attempt = { _id: attemptId, responses: [], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await addResponseToQuestion(attemptId, questionId, { questionType: "multiple-choice", selectedOptionIndex: 1 } as any);

      expect(attempt.responses[0]).toMatchObject({ question: questionId, selectedOption: 1 });
      expect(mockSave).toHaveBeenCalled();
    });

    it("should add binary-choice response", async () => {
      const attempt = { _id: attemptId, responses: [], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await addResponseToQuestion(attemptId, questionId, { questionType: "binary-choice", selectedOption: "positive" } as any);

      expect(attempt.responses[0]).toMatchObject({ question: questionId, choice: true });
      expect(mockSave).toHaveBeenCalled();
    });

    it("should throw Error for unsupported question type", async () => {
      const attempt = { _id: attemptId, responses: [], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await expect(addResponseToQuestion(attemptId, questionId, { questionType: "unknown" } as any)).rejects.toThrow("Unsupported question type");
    });
  });

  describe("getExistingResponseInQuestion", () => {
    it("should throw NotFoundError if question does not exist", async () => {
      jest.spyOn(QuestionModel, "findById").mockResolvedValue(null);
      await expect(getExistingResponseInQuestion(attemptId, questionId)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if attempt does not exist", async () => {
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(null);
      await expect(getExistingResponseInQuestion(attemptId, questionId)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if response not found", async () => {
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue({ _id: attemptId, responses: [] });
      await expect(getExistingResponseInQuestion(attemptId, questionId)).rejects.toThrow(NotFoundError);
    });

    it("should return the response", async () => {
      const mockResponse = { question: questionId, response: "test" };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue({ _id: attemptId, responses: [mockResponse] });

      const result = await getExistingResponseInQuestion(attemptId, questionId);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateResponseToQuestion", () => {
    it("should throw NotFoundError if question does not exist", async () => {
      jest.spyOn(QuestionModel, "findById").mockResolvedValue(null);
      await expect(updateResponseToQuestion(attemptId, questionId, {} as any)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if attempt does not exist", async () => {
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(null);
      await expect(updateResponseToQuestion(attemptId, questionId, {} as any)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if response not found", async () => {
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue({ _id: attemptId, responses: [] });
      await expect(updateResponseToQuestion(attemptId, questionId, {} as any)).rejects.toThrow(NotFoundError);
    });

    it("should update open-ended response", async () => {
      const mockResponse = { question: questionId, responseType: "open-ended", response: "old" };
      const attempt = { _id: attemptId, responses: [mockResponse], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await updateResponseToQuestion(attemptId, questionId, { response: "new" } as any);
      expect(mockResponse.response).toBe("new");
      expect(mockSave).toHaveBeenCalled();
    });

    it("should update multiple-choice response", async () => {
      const mockResponse = { question: questionId, responseType: "multiple-choice", selectedOption: 0 };
      const attempt = { _id: attemptId, responses: [mockResponse], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await updateResponseToQuestion(attemptId, questionId, { selectedOptionIndex: 1 } as any);
      expect(mockResponse.selectedOption).toBe(1);
      expect(mockSave).toHaveBeenCalled();
    });

    it("should update binary-choice response", async () => {
      const mockResponse = { question: questionId, responseType: "binary-choice", choice: false };
      const attempt = { _id: attemptId, responses: [mockResponse], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await updateResponseToQuestion(attemptId, questionId, { selectedOption: "positive" } as any);
      expect(mockResponse.choice).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });

    it("should update likert-scale response", async () => {
      const mockResponse = { question: questionId, responseType: "likert-scale", rating: 1 };
      const attempt = { _id: attemptId, responses: [mockResponse], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await updateResponseToQuestion(attemptId, questionId, { selectedValue: 5 } as any);
      expect(mockResponse.rating).toBe(5);
      expect(mockSave).toHaveBeenCalled();
    });

    it("should throw Error for invalid likert-scale update", async () => {
      const mockResponse = { question: questionId, responseType: "likert-scale", rating: 1 };
      const attempt = { _id: attemptId, responses: [mockResponse], save: mockSave };
      jest.spyOn(QuestionModel, "findById").mockResolvedValue({ _id: questionId });
      jest.spyOn(AttemptModel, "findById").mockResolvedValue(attempt);

      await expect(updateResponseToQuestion(attemptId, questionId, { selectedValue: 6 } as any)).rejects.toThrow("Rating must be between 1 and 5");
    });
  });
});