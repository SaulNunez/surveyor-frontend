import { AttemptModel } from "../libs/models/attemptSchema";
import { createNewAttempt, deleteAttempt, completeAttempt, getAttempt } from "../libs/services/attemptService";
import { NotFoundError } from "../libs/models/Errors/notFoundError";
import { SurveyModel } from "../libs/models/surveySchema";

jest.mock("../libs/models/attemptSchema");
jest.mock("../libs/models/surveySchema");

const mockAttempt = {
  _id: "attempt-id",
  surveyId: "survey-id",
  userId: "user-id",
  answers: {},
  completed: false,
  save: jest.fn(),
};

const userId = "user-id";
const surveyId = "survey-id";
const attemptId = "attempt-id";

beforeEach(() => {
  jest.clearAllMocks();
});

test("Creating new attempt when given surveyId doens't exist", async () => {
  jest.spyOn(SurveyModel, "findById").mockResolvedValue(null);
  await expect(createNewAttempt(surveyId, userId)).rejects.toThrow(NotFoundError);
});

test("Creating new attempt when given surveyId has no existing attempts", async () => {
  jest.spyOn(SurveyModel, "findById").mockResolvedValue({ _id: surveyId });
  jest.spyOn(AttemptModel, "findOne").mockResolvedValue(null);
  jest.spyOn(AttemptModel, "create").mockResolvedValue(mockAttempt);

  const result = await createNewAttempt(surveyId, userId);
  expect(result).toEqual(mockAttempt);
});

test("Creating new attempt when given surveyId has existing completed attempt", async () => {
  jest.spyOn(SurveyModel, "findById").mockResolvedValue({ _id: surveyId });
  const completedAttempt = { ...mockAttempt, completed: true };
  jest.spyOn(AttemptModel, "findOne").mockResolvedValue(completedAttempt);
  jest.spyOn(AttemptModel, "create").mockResolvedValue(mockAttempt);

  const result = await createNewAttempt(surveyId, userId);
  expect(result).toEqual(mockAttempt);
});

test("Creating new attempt when given surveyId has existing uncompleted attempt", async () => {
  jest.spyOn(SurveyModel, "findById").mockResolvedValue({ _id: surveyId });
  jest.spyOn(AttemptModel, "findOne").mockResolvedValue(mockAttempt);

  const result = await createNewAttempt(surveyId, userId);
  expect(result).toEqual(mockAttempt);
  expect(AttemptModel.create).not.toHaveBeenCalled();
});

test("Deleting attempt that doesn't exist", async () => {
  jest.spyOn(AttemptModel, "findById").mockResolvedValue(null);
  await expect(deleteAttempt(attemptId)).rejects.toThrow(NotFoundError);
});

test("Deleting attempt that exists", async () => {
  jest.spyOn(AttemptModel, "findById").mockResolvedValue(mockAttempt);
  jest.spyOn(AttemptModel, "deleteOne").mockResolvedValue({ deletedCount: 1 });

  await deleteAttempt(attemptId);
  expect(AttemptModel.deleteOne).toHaveBeenCalledWith({ _id: attemptId });
});

test("Completing attempt that doesn't exist", async () => {
  jest.spyOn(AttemptModel, "findById").mockResolvedValue(null);
  await expect(completeAttempt(attemptId, {})).rejects.toThrow(NotFoundError);
});

test("Completing attempt that exists", async () => {
  jest.spyOn(AttemptModel, "findById").mockResolvedValue(mockAttempt);
  await completeAttempt(attemptId, { q1: "a1" });
  expect(mockAttempt.save).toHaveBeenCalled();
});

test("Getting existing attempt when surveyId doesn't exist", async () => {
  jest.spyOn(SurveyModel, "findById").mockResolvedValue(null);
  await expect(getAttempt(surveyId, userId)).rejects.toThrow(NotFoundError);
});

test("Getting existing attempt when surveyId has no attempts for this user", async () => {
  jest.spyOn(SurveyModel, "findById").mockResolvedValue({ _id: surveyId });
  jest.spyOn(AttemptModel, "findOne").mockResolvedValue(null);
  
  const result = await getAttempt(surveyId, userId);
  expect(result).toBeNull();
});