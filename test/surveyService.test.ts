import { getAllSurveysForUser, getSurvey, createSurvey, editSurvey, deleteSurvey } from "../libs/services/surveyService";
import { SurveyModel } from "../libs/models/surveySchema";
import { NotFoundError } from "../libs/models/Errors/notFoundError";

jest.mock("../libs/models/surveySchema");

describe("surveyService", () => {
  const userId = "user-id";
  const surveyId = "survey-id";
  const mockSurvey = {
    _id: surveyId,
    title: "Test Survey",
    description: "Test Description",
    user: userId,
    createdAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllSurveysForUser", () => {
    it("should return surveys for user", async () => {
      const surveys = [mockSurvey];
      jest.spyOn(SurveyModel, "find").mockReturnValue({
        exec: jest.fn().mockResolvedValue(surveys),
      } as any);

      const result = await getAllSurveysForUser(userId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(surveyId);
    });
  });

  describe("getSurvey", () => {
    it("should return survey if found", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSurvey),
      } as any);

      const result = await getSurvey(surveyId);
      expect(result.id).toBe(surveyId);
    });

    it("should throw NotFoundError if survey not found", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(getSurvey(surveyId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("createSurvey", () => {
    it("should create and return survey", async () => {
      jest.spyOn(SurveyModel, "create").mockResolvedValue(mockSurvey as any);

      const result = await createSurvey("Title", "Desc", userId);
      expect(result.id).toBe(surveyId);
      expect(SurveyModel.create).toHaveBeenCalledWith({ title: "Title", description: "Desc", user: userId });
    });
  });

  describe("editSurvey", () => {
    it("should update survey if found and user matches", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSurvey),
      } as any);

      const result = await editSurvey(surveyId, userId, "New Title", "New Desc");
      expect(mockSurvey.title).toBe("New Title");
      expect(mockSurvey.save).toHaveBeenCalled();
      expect(result.title).toBe("New Title");
    });

    it("should throw NotFoundError if survey not found", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(editSurvey(surveyId, userId, "T", "D")).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if user does not match", async () => {
      const otherUserSurvey = { ...mockSurvey, user: "other-user" };
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(otherUserSurvey),
      } as any);

      await expect(editSurvey(surveyId, userId, "T", "D")).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteSurvey", () => {
    it("should delete survey if found and user matches", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSurvey),
      } as any);
      jest.spyOn(SurveyModel, "deleteOne").mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      } as any);

      const result = await deleteSurvey(surveyId, userId);
      expect(result).toBe(true);
      expect(SurveyModel.deleteOne).toHaveBeenCalledWith({ _id: surveyId });
    });

    it("should throw NotFoundError if survey not found", async () => {
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(deleteSurvey(surveyId, userId)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if user does not match", async () => {
      const otherUserSurvey = { ...mockSurvey, user: "other-user" };
      jest.spyOn(SurveyModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(otherUserSurvey),
      } as any);

      await expect(deleteSurvey(surveyId, userId)).rejects.toThrow(NotFoundError);
    });
  });
});