import { createNewAttempt, deleteExistingAttempt, completeExistingAttempt, getExistingAttempt } from "../libs/services/attemptService";
import { NotFoundError } from "../libs/models/Errors/notFoundError";
import { InvalidOperationError } from "../libs/models/Errors/invalidOperationError";
import * as attemptRepository from "../libs/repositories/attemptRepository";
import { ObjectId } from "mongodb";

jest.mock("../libs/repositories/attemptRepository");

describe("attemptService", () => {
  const userId = "user-id";
  const surveyId = "survey-id";
  const attemptId = new ObjectId();
  const attemptIdStr = attemptId.toString();

  let mockAttempt: any;

  const mockGetAttemptBySurveyAndUser = attemptRepository.getAttemptBySurveyAndUser as jest.Mock;
  const mockCreateAttempt = attemptRepository.createAttempt as jest.Mock;
  const mockGetAttemptById = attemptRepository.getAttemptById as jest.Mock;
  const mockEditExistingAttempt = attemptRepository.editExistingAttempt as jest.Mock;
  const mockDeleteAttempt = attemptRepository.deleteAttempt as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAttempt = {
      _id: attemptId,
      survey: surveyId,
      user: userId,
      startedAt: new Date(),
      completedAt: undefined,
    };
  });

  describe("createNewAttempt", () => {
    it("should create new attempt if no existing attempt", async () => {
      mockGetAttemptBySurveyAndUser.mockResolvedValue(null);
      mockCreateAttempt.mockResolvedValue(mockAttempt._id);
      mockGetAttemptById.mockResolvedValue(mockAttempt);

      const result = await createNewAttempt(surveyId, userId);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().id).toBe(attemptIdStr);
      expect(mockCreateAttempt).toHaveBeenCalledWith(surveyId, userId);
    });

    it("should return existing attempt if it is completed", async () => {
      const completedAttempt = { ...mockAttempt, completedAt: new Date() };
      mockGetAttemptBySurveyAndUser.mockResolvedValue(completedAttempt);

      const result = await createNewAttempt(surveyId, userId);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().id).toBe(attemptIdStr);
      expect(mockCreateAttempt).not.toHaveBeenCalled();
    });

    it("should create new attempt if existing attempt is not completed", async () => {
      // Based on current service logic: if existing attempt is NOT completed, it falls through to createAttempt
      mockGetAttemptBySurveyAndUser.mockResolvedValue(mockAttempt);
      // NOTE: The implementation actually creates a NEW attempt if the existing one is not completed? 
      // Looking at the code: 
      // if (existingAttempt && existingAttempt.completedAt) { return existing }
      // ... createAttempt(surveyId, userId)
      // So yes, if existing is not completed, it proceeds to create a new one (ignoring the active one?). 
      // This seems like a potential logic bug in the original code, but I am refactoring, not fixing logic unless requested.
      // Wait, if an attempt exists and is NOT completed, shouldn't we return it? 
      // The original code fell through to createNewAttempt. 
      // "const existingAttempt = await getAttemptBySurveyAndUser... if(existingAttempt && existingAttempt.completedAt) return ... const newAttemptId = awaiting createAttempt..."
      // Yes, it duplicates attempts if one is active. I will preserve this behavior.

      const newId = new ObjectId();
      mockCreateAttempt.mockResolvedValue(newId);
      mockGetAttemptById.mockResolvedValue({ ...mockAttempt, _id: newId });

      const result = await createNewAttempt(surveyId, userId);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().id).toBe(newId.toString());
      expect(mockCreateAttempt).toHaveBeenCalledWith(surveyId, userId);
    });
  });

  describe("deleteExistingAttempt", () => {
    it("should return NotFoundError if attempt does not exist", async () => {
      mockGetAttemptById.mockResolvedValue(null);
      const result = await deleteExistingAttempt(attemptIdStr, userId);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    });

    it("should return NotFoundError if attempt belongs to another user", async () => {
      mockGetAttemptById.mockResolvedValue({ ...mockAttempt, user: "other-user" });
      const result = await deleteExistingAttempt(attemptIdStr, userId);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    });

    it("should delete attempt if found and user matches", async () => {
      mockGetAttemptById.mockResolvedValue(mockAttempt);
      mockDeleteAttempt.mockResolvedValue(true);

      const result = await deleteExistingAttempt(attemptIdStr, userId);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(true);
      expect(mockDeleteAttempt).toHaveBeenCalledWith(attemptIdStr, userId);
    });
  });

  describe("completeExistingAttempt", () => {
    it("should return NotFoundError if attempt does not exist", async () => {
      mockGetAttemptById.mockResolvedValue(null);
      const result = await completeExistingAttempt(attemptIdStr, userId);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    });

    it("should return InvalidOperationError if attempt already completed", async () => {
      mockGetAttemptById.mockResolvedValue({ ...mockAttempt, completedAt: new Date() });
      const result = await completeExistingAttempt(attemptIdStr, userId);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidOperationError);
    });

    it("should complete attempt if valid", async () => {
      mockGetAttemptById.mockResolvedValue(mockAttempt);
      mockEditExistingAttempt.mockResolvedValue(true); // Assuming update returns success

      const result = await completeExistingAttempt(attemptIdStr, userId);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().completedAt).toBeDefined();
      expect(mockEditExistingAttempt).toHaveBeenCalledWith(attemptIdStr, userId, expect.objectContaining({ completedAt: expect.any(Date) }));
    });
  });

  describe("getExistingAttempt", () => {
    it("should return NotFoundError if no attempt found", async () => {
      mockGetAttemptBySurveyAndUser.mockResolvedValue(null);
      const result = await getExistingAttempt(surveyId, userId);
      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    });

    it("should return null if attempt is completed", async () => {
      mockGetAttemptBySurveyAndUser.mockResolvedValue({ ...mockAttempt, completedAt: new Date() });
      const result = await getExistingAttempt(surveyId, userId);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBeNull();
    });

    it("should return attempt if active", async () => {
      mockGetAttemptBySurveyAndUser.mockResolvedValue(mockAttempt);
      const result = await getExistingAttempt(surveyId, userId);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()!.id).toBe(attemptIdStr);
    });
  });
});