import { createNewAttempt, deleteExistingAttempt, completeExistingAttempt, getExistingAttempt } from "../libs/services/attemptService";
import { NotFoundError } from "../libs/models/Errors/notFoundError";
import { InvalidOperationError } from "../libs/models/Errors/invalidOperationError";
import * as attemptRepository from "../libs/repositories/attemptRepository";

jest.mock("../libs/repositories/attemptRepository");

describe("attemptService", () => {
  const userId = "user-id";
  const surveyId = "survey-id";
  const attemptId = "attempt-id";

  const mockAttempt = {
    _id: attemptId,
    survey: surveyId,
    user: userId,
    startedAt: new Date(),
    completedAt: undefined,
  };

  const mockGetAttemptBySurveyAndUser = attemptRepository.getAttemptBySurveyAndUser as jest.Mock;
  const mockCreateAttempt = attemptRepository.createAttempt as jest.Mock;
  const mockGetAttemptById = attemptRepository.getAttemptById as jest.Mock;
  const mockEditExistingAttempt = attemptRepository.editExistingAttempt as jest.Mock;
  const mockDeleteAttempt = attemptRepository.deleteAttempt as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createNewAttempt", () => {
    it("should create new attempt if no existing attempt", async () => {
      mockGetAttemptBySurveyAndUser.mockResolvedValue(null);
      mockCreateAttempt.mockResolvedValue(mockAttempt);

      const result = await createNewAttempt(surveyId, userId);

      expect(result.id).toBe(attemptId);
      expect(mockCreateAttempt).toHaveBeenCalledWith(surveyId, userId);
    });

    it("should return existing attempt if it is completed", async () => {
      const completedAttempt = { ...mockAttempt, completedAt: new Date() };
      mockGetAttemptBySurveyAndUser.mockResolvedValue(completedAttempt);

      const result = await createNewAttempt(surveyId, userId);

      expect(result.id).toBe(attemptId);
      expect(mockCreateAttempt).not.toHaveBeenCalled();
    });

    it("should create new attempt if existing attempt is not completed", async () => {
      // Based on current service logic: if existing attempt is NOT completed, it falls through to createAttempt
      mockGetAttemptBySurveyAndUser.mockResolvedValue(mockAttempt);
      mockCreateAttempt.mockResolvedValue({ ...mockAttempt, _id: "new-id" });

      const result = await createNewAttempt(surveyId, userId);

      expect(result.id).toBe("new-id");
      expect(mockCreateAttempt).toHaveBeenCalledWith(surveyId, userId);
    });
  });

  describe("deleteExistingAttempt", () => {
    it("should throw NotFoundError if attempt does not exist", async () => {
      mockGetAttemptById.mockResolvedValue(null);
      await expect(deleteExistingAttempt(attemptId, userId)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if attempt belongs to another user", async () => {
      mockGetAttemptById.mockResolvedValue({ ...mockAttempt, user: "other-user" });
      await expect(deleteExistingAttempt(attemptId, userId)).rejects.toThrow(NotFoundError);
    });

    it("should delete attempt if found and user matches", async () => {
      mockGetAttemptById.mockResolvedValue(mockAttempt);
      mockDeleteAttempt.mockResolvedValue(true);

      await deleteExistingAttempt(attemptId, userId);
      expect(mockDeleteAttempt).toHaveBeenCalledWith(attemptId);
    });
  });

  describe("completeExistingAttempt", () => {
    it("should throw NotFoundError if attempt does not exist", async () => {
      mockGetAttemptById.mockResolvedValue(null);
      await expect(completeExistingAttempt(attemptId, userId)).rejects.toThrow(NotFoundError);
    });

    it("should throw InvalidOperationError if attempt already completed", async () => {
      mockGetAttemptById.mockResolvedValue({ ...mockAttempt, completedAt: new Date() });
      await expect(completeExistingAttempt(attemptId, userId)).rejects.toThrow(InvalidOperationError);
    });

    it("should complete attempt if valid", async () => {
      mockGetAttemptById.mockResolvedValue(mockAttempt);

      const result = await completeExistingAttempt(attemptId, userId);

      expect(result.completedAt).toBeDefined();
      expect(mockEditExistingAttempt).toHaveBeenCalledWith(attemptId, userId, expect.objectContaining({ completedAt: expect.any(Date) }));
    });
  });

  describe("getExistingAttempt", () => {
    it("should throw NotFoundError if no attempt found", async () => {
      mockGetAttemptBySurveyAndUser.mockResolvedValue(null);
      await expect(getExistingAttempt(surveyId, userId)).rejects.toThrow(NotFoundError);
    });

    it("should return null if attempt is completed", async () => {
      mockGetAttemptBySurveyAndUser.mockResolvedValue({ ...mockAttempt, completedAt: new Date() });
      const result = await getExistingAttempt(surveyId, userId);
      expect(result).toBeNull();
    });

    it("should return attempt if active", async () => {
      mockGetAttemptBySurveyAndUser.mockResolvedValue(mockAttempt);
      const result = await getExistingAttempt(surveyId, userId);
      expect(result.id).toBe(attemptId);
    });
  });
});