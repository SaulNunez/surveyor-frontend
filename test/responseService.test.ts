import { describe, it, expect } from 'vitest';
import { db } from '../libs/db';
import { users, surveys, attempts, questions, responses } from '../libs/db/schema';
import { addResponseToQuestion, getExistingResponseInQuestion, updateResponseToQuestion } from '../libs/services/responseService';
import { NotFoundError } from '../libs/models/Errors/notFoundError';
import { InvalidOperationError } from '../libs/models/Errors/invalidOperationError';
import { eq, and } from 'drizzle-orm';

describe('responseService', () => {
  it('should manage responses on a live database', async () => {
    // 1. Seed user, survey, attempt, and questions
    const [user] = await db.insert(users).values({
      email: 'response@example.com',
      password: 'password',
    }).returning();

    const [survey] = await db.insert(surveys).values({
      title: 'Survey for Responses',
      description: 'Desc',
      userId: user.id,
    }).returning();

    const [attempt] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();

    const [mcqQuestion] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'MCQ Question',
      questionType: 'multiple-choice',
      options: ['A', 'B'],
    }).returning();

    const [likertQuestion] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'Likert Question',
      questionType: 'likert-scale',
      positiveLabel: 'Good',
      negativeLabel: 'Bad',
    }).returning();

    // 2. Test: add MCQ response
    const res1 = await addResponseToQuestion(attempt.id, mcqQuestion.id, {
      questionType: 'multiple-choice',
      selectedOptionIndex: 1,
    });
    expect(res1.id).toBe(attempt.id);
    expect(res1.responses).toHaveLength(1);
    expect(res1.responses[0].questionId).toBe(mcqQuestion.id);
    expect(res1.responses[0].selectedOption).toBe(1);

    // 3. Test: get existing response
    const existingRes = await getExistingResponseInQuestion(attempt.id, mcqQuestion.id);
    expect(existingRes.selectedOption).toBe(1);

    // 4. Test: add duplicate response (should throw InvalidOperationError)
    await expect(addResponseToQuestion(attempt.id, mcqQuestion.id, {
      questionType: 'multiple-choice',
      selectedOptionIndex: 0,
    })).rejects.toThrow(InvalidOperationError);

    // 5. Test: add invalid likert rating (should throw Error)
    await expect(addResponseToQuestion(attempt.id, likertQuestion.id, {
      questionType: 'likert-scale',
      selectedValue: 10,
    })).rejects.toThrow('Selected value must be between 1 and 5 for question');

    // 6. Test: update response
    const updated = await updateResponseToQuestion(attempt.id, mcqQuestion.id, {
      questionType: 'multiple-choice',
      selectedOptionIndex: 0,
    });
    expect(updated.selectedOption).toBe(0);

    const verifiedRes = await getExistingResponseInQuestion(attempt.id, mcqQuestion.id);
    expect(verifiedRes.selectedOption).toBe(0);
  });
});