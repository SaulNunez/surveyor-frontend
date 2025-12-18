import { createQuestion, getQuestionsForSurvey, editQuestion, deleteQuestion } from "../libs/services/questionService";
import { SurveyModel } from "../libs/models/surveySchema";
import { BinaryChoiceQuestion, LikertScaleQuestion, MultipleChoiceQuestion, OpenEndedQuestion } from "../libs/models/questionSchema";

jest.mock("../libs/models/surveySchema");
jest.mock("../libs/models/questionSchema");

describe("questionService", () => {
  const surveyId = "survey-id";
  const questionId = "question-id";
  let mockSurvey: any;
  let mockQuestions: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the questions array with Mongoose-like methods
    mockQuestions = [];
    mockQuestions.id = jest.fn();
    mockQuestions.pull = jest.fn();

    mockSurvey = {
      _id: surveyId,
      questions: mockQuestions,
      save: jest.fn(),
    };

    // Mock SurveyModel.findById to return the mock survey
    jest.spyOn(SurveyModel, "findById").mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSurvey),
    } as any);
  });

  describe("createQuestion", () => {
    it("should throw Error if survey not found", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(createQuestion(surveyId, {} as any)).rejects.toThrow("Survey not found");
    });

    it("should create multiple-choice question", async () => {
      const input = { questionType: "multiple-choice", title: "MCQ", options: ["A", "B"] };
      await createQuestion(surveyId, input as any);

      expect(mockSurvey.questions).toHaveLength(1);
      expect(mockSurvey.questions[0]).toMatchObject({ text: "MCQ", options: ["A", "B"] });
      expect(mockSurvey.save).toHaveBeenCalled();
    });

    it("should create binary-choice question", async () => {
      const input = { questionType: "binary-choice", title: "Binary", positiveLabel: "Yes", negativeLabel: "No" };
      await createQuestion(surveyId, input as any);

      expect(mockSurvey.questions).toHaveLength(1);
      expect(mockSurvey.questions[0]).toMatchObject({ text: "Binary", positiveLabel: "Yes", negativeLabel: "No" });
      expect(mockSurvey.save).toHaveBeenCalled();
    });

    it("should create likert-scale question", async () => {
      const input = { questionType: "likert-scale", title: "Likert", positiveLabel: "Good", negativeLabel: "Bad" };
      await createQuestion(surveyId, input as any);

      expect(mockSurvey.questions).toHaveLength(1);
      expect(mockSurvey.questions[0]).toMatchObject({ text: "Likert", positiveLabel: "Good", negativeLabel: "Bad" });
      expect(mockSurvey.save).toHaveBeenCalled();
    });

    it("should create open-ended question", async () => {
      const input = { questionType: "open-ended", title: "Open" };
      await createQuestion(surveyId, input as any);

      expect(mockSurvey.questions).toHaveLength(1);
      expect(mockSurvey.questions[0]).toMatchObject({ text: "Open", questionType: "open-ended" });
      expect(mockSurvey.save).toHaveBeenCalled();
    });

    it("should throw Error for invalid question type", async () => {
      const input = { questionType: "invalid", title: "Test" };
      await expect(createQuestion(surveyId, input as any)).rejects.toThrow("Invalid question type");
    });
  });

  describe("getQuestionsForSurvey", () => {
    it("should throw Error if survey not found", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(getQuestionsForSurvey(surveyId)).rejects.toThrow("Survey not found");
    });

    it("should return mapped questions", async () => {
      // Manually create instances of the mocked classes so `instanceof` checks pass
      const binaryQ = new BinaryChoiceQuestion();
      Object.assign(binaryQ, { id: "1", text: "Binary", positiveLabel: "Y", negativeLabel: "N" });

      const likertQ = new LikertScaleQuestion();
      Object.assign(likertQ, { id: "2", text: "Likert", positiveLabel: "G", negativeLabel: "B" });

      const mcqQ = new MultipleChoiceQuestion();
      Object.assign(mcqQ, { id: "3", text: "MCQ", options: ["1", "2"] });

      const openQ = new OpenEndedQuestion();
      Object.assign(openQ, { id: "4", text: "Open" });

      mockSurvey.questions.push(binaryQ, likertQ, mcqQ, openQ);

      const result = await getQuestionsForSurvey(surveyId);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ id: "1", questionType: "binary-choice", title: "Binary", positiveLabel: "Y", negativeLabel: "N" });
      expect(result[1]).toEqual({ id: "2", questionType: "likert-scale", title: "Likert", positiveLabel: "G", negativeLabel: "B" });
      expect(result[2]).toEqual({ id: "3", questionType: "multiple-choice", title: "MCQ", options: ["1", "2"] });
      expect(result[3]).toEqual({ id: "4", questionType: "open-ended", title: "Open" });
    });

    it("should throw Error for unsupported question type in DB", async () => {
      // Push a plain object or unknown type
      mockSurvey.questions.push({});
      await expect(getQuestionsForSurvey(surveyId)).rejects.toThrow("Unsupported question type");
    });
  });

  describe("editQuestion", () => {
    it("should throw Error if survey not found", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(editQuestion(surveyId, questionId, {} as any)).rejects.toThrow("Survey not found");
    });

    it("should throw Error if question not found", async () => {
      mockQuestions.id.mockReturnValue(null);
      await expect(editQuestion(surveyId, questionId, {} as any)).rejects.toThrow("Question not found");
    });

    it("should edit multiple-choice question", async () => {
      const mockQ = { updateOne: jest.fn() };
      mockQuestions.id.mockReturnValue(mockQ);

      const input = { questionType: "multiple-choice", title: "New Title", options: ["C"] };
      await editQuestion(surveyId, questionId, input as any);

      expect(mockQ.updateOne).toHaveBeenCalledWith({ text: "New Title", options: ["C"] });
      expect(mockSurvey.save).toHaveBeenCalled();
    });

    it("should edit binary-choice question", async () => {
      const mockQ = { updateOne: jest.fn() };
      mockQuestions.id.mockReturnValue(mockQ);

      const input = { questionType: "binary-choice", title: "New Title", positiveLabel: "Y", negativeLabel: "N" };
      await editQuestion(surveyId, questionId, input as any);

      expect(mockQ.updateOne).toHaveBeenCalledWith({ text: "New Title", positiveLabel: "Y", negativeLabel: "N" });
      expect(mockSurvey.save).toHaveBeenCalled();
    });

    it("should edit likert-scale question", async () => {
      const mockQ = { updateOne: jest.fn() };
      mockQuestions.id.mockReturnValue(mockQ);

      const input = { questionType: "likert-scale", title: "New Title", positiveLabel: "G", negativeLabel: "B" };
      await editQuestion(surveyId, questionId, input as any);

      expect(mockQ.updateOne).toHaveBeenCalledWith({ text: "New Title", positiveLabel: "G", negativeLabel: "B" });
      expect(mockSurvey.save).toHaveBeenCalled();
    });

    it("should edit open-ended question", async () => {
      const mockQ = { updateOne: jest.fn() };
      mockQuestions.id.mockReturnValue(mockQ);

      const input = { questionType: "open-ended", title: "New Title" };
      await editQuestion(surveyId, questionId, input as any);

      expect(mockQ.updateOne).toHaveBeenCalledWith({ text: "New Title" });
      expect(mockSurvey.save).toHaveBeenCalled();
    });

    it("should throw Error for invalid question type", async () => {
      const mockQ = { updateOne: jest.fn() };
      mockQuestions.id.mockReturnValue(mockQ);

      const input = { questionType: "invalid" };
      await expect(editQuestion(surveyId, questionId, input as any)).rejects.toThrow("Invalid question type");
    });
  });

  describe("deleteQuestion", () => {
    it("should throw Error if survey not found", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(deleteQuestion(surveyId, questionId)).rejects.toThrow("Survey not found");
    });

    it("should throw Error if question not found (pull returns null)", async () => {
      mockQuestions.pull.mockReturnValue(null);
      await expect(deleteQuestion(surveyId, questionId)).rejects.toThrow("Question not found");
    });

    it("should delete question", async () => {
      const mockQuestion = { remove: jest.fn() };
      // Mock pull to return the question object, as expected by the service logic
      mockQuestions.pull.mockReturnValue(mockQuestion);

      await deleteQuestion(surveyId, questionId);

      expect(mockQuestions.pull).toHaveBeenCalledWith({ _id: questionId });
      expect(mockQuestion.remove).toHaveBeenCalled();
      expect(mockSurvey.save).toHaveBeenCalled();
    });
  });
});