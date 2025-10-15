import { AttemptModel } from "../models/attemptSchema";
import {expect, jest, test} from '@jest/globals';
import { createNewAttempt } from "./attemptService";
import { NotFoundError } from "../models/Errors/notFoundError";

test("Creating new attempt when given surveyId doens't exist", async () => {
    (AttemptModel.find as jest.Mock).mockResolvedValue([]);
    
    await expect(createNewAttempt('nonexistentSurveyId', 'userId')).rejects.toThrow(NotFoundError);
});

test("Creating new attempt when given surveyId has no existing attempts", async () => {
});

test ("Creating new attempt when given surveyId has existing completed attempt", async () => {
});

test ("Creating new attempt when given surveyId has existing uncompleted attempt", async () => {
});

test ("Deleting attempt that doesn't exist", async () => {
});

test ("Deleting attempt that exists", async () => {
});

test ("Completing attempt that doesn't exist", async () => {
});

test ("Completing attempt that exists", async () => {
});

test ("Getting existing attempt when surveyId doesn't exist", async () => {
});

test ("Getting existing attempt when surveyId has no attempts for this user", async () => {
});