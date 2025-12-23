import { getAllSurveysForUser, getSurvey, createSurvey, editSurvey, deleteSurvey } from "../libs/services/surveyService";
import { NotFoundError } from "../libs/models/Errors/notFoundError";
import * as surveyRepository from "../libs/repositories/surveyRepository";

jest.mock("../libs/repositories/surveyRepository");

describe("surveyService", () => {
  const userId = "user-id";
  const surveyId = "survey-id";
  const mockSurvey = {
    _id: surveyId,
    title: "Test Survey",
    description: "Test Description",
    user: userId,
    createdAt: new Date(),
  };

  const mockGetSurveysByUser = surveyRepository.getSurveysByUser as jest.Mock;
  const mockGetSurveyById = surveyRepository.getSurveyById as jest.Mock;
  const mockCreateSurvey = surveyRepository.createSurvey as jest.Mock;
  const mockUpdateSurvey = surveyRepository.updateSurvey as jest.Mock;
  const mockDeleteSurvey = surveyRepository.deleteSurvey as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllSurveysForUser", () => {
    it("should return surveys for user", async () => {
      mockGetSurveysByUser.mockResolvedValue([mockSurvey]);

      const result = await getAllSurveysForUser(userId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(surveyId);
      expect(mockGetSurveysByUser).toHaveBeenCalledWith(userId);
    });
  });

  describe("getSurvey", () => {
    it("should return survey if found", async () => {
      mockGetSurveyById.mockResolvedValue(mockSurvey);

      const result = await getSurvey(surveyId);
      expect(result.id).toBe(surveyId);
      expect(mockGetSurveyById).toHaveBeenCalledWith(surveyId);
    });

    it("should throw NotFoundError if survey not found", async () => {
      mockGetSurveyById.mockResolvedValue(null);

      await expect(getSurvey(surveyId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("createSurvey", () => {
    it("should create and return survey", async () => {
      mockCreateSurvey.mockResolvedValue(mockSurvey);

      const result = await createSurvey("Title", "Desc", userId);
      expect(result.id).toBe(surveyId);
      expect(mockCreateSurvey).toHaveBeenCalledWith("Title", "Desc", userId);
    });
  });

  describe("editSurvey", () => {
    it("should update survey if found and user matches", async () => {
      mockGetSurveyById.mockResolvedValue(mockSurvey);
      mockUpdateSurvey.mockResolvedValue({ ...mockSurvey, title: "New Title" });

      const result = await editSurvey(surveyId, userId, "New Title", "New Desc");
      expect(mockUpdateSurvey).toHaveBeenCalledWith(surveyId, "New Title", "New Desc");
      expect(result.title).toBe("New Title");
    });

    it("should throw NotFoundError if survey not found", async () => {
      mockGetSurveyById.mockResolvedValue(null);

      await expect(editSurvey(surveyId, userId, "T", "D")).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if user does not match", async () => {
      const otherUserSurvey = { ...mockSurvey, user: "other-user" };
      mockGetSurveyById.mockResolvedValue(otherUserSurvey);

      await expect(editSurvey(surveyId, userId, "T", "D")).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteSurvey", () => {
    it("should delete survey if found and user matches", async () => {
      mockGetSurveyById.mockResolvedValue(mockSurvey);
      mockDeleteSurvey.mockResolvedValue(true);

      const result = await deleteSurvey(surveyId, userId);
      expect(result).toBe(true);
      expect(mockDeleteSurvey).toHaveBeenCalledWith(surveyId, userId);
    });

    it("should throw NotFoundError if survey not found", async () => {
      mockGetSurveyById.mockResolvedValue(null);

      await expect(deleteSurvey(surveyId, userId)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if user does not match", async () => {
      const otherUserSurvey = { ...mockSurvey, user: "other-user" };
      mockGetSurveyById.mockResolvedValue(otherUserSurvey);

      await expect(deleteSurvey(surveyId, userId)).rejects.toThrow(NotFoundError);
    });
  });
});