import { describe, it, expect } from 'vitest';
import { db } from '../libs/db';
import { users, surveys, attempts, questions, responses } from '../libs/db/schema';
import { saveResponse, getExistingResponseInQuestion, getResponsesForAttempt } from '../libs/services/responseService';
import { NotFoundError } from '../libs/models/Errors/notFoundError';
import { eq } from 'drizzle-orm';

async function seed(email: string) {
  const [user] = await db.insert(users).values({ email, password: 'password' }).returning();

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

  return { user, survey, attempt, mcqQuestion, likertQuestion };
}

describe('responseService', () => {
  it('should manage responses on a live database', async () => {
    const { attempt, mcqQuestion, likertQuestion } = await seed('response@example.com');

    // 1. Saving an answer for the first time inserts it
    const saved = await saveResponse(attempt.id, mcqQuestion.id, {
      questionType: 'multiple-choice',
      selectedOptionIndex: 1,
    });
    expect(saved.questionId).toBe(mcqQuestion.id);
    expect(saved.selectedOption).toBe(1);
    expect(await getResponsesForAttempt(attempt.id)).toHaveLength(1);

    const existingRes = await getExistingResponseInQuestion(attempt.id, mcqQuestion.id);
    expect(existingRes.selectedOption).toBe(1);

    // 2. Saving again replaces the answer rather than adding a second row
    const updated = await saveResponse(attempt.id, mcqQuestion.id, {
      questionType: 'multiple-choice',
      selectedOptionIndex: 0,
    });
    expect(updated.selectedOption).toBe(0);
    expect(await getResponsesForAttempt(attempt.id)).toHaveLength(1);

    // 3. Out-of-range likert ratings are rejected
    await expect(saveResponse(attempt.id, likertQuestion.id, {
      questionType: 'likert-scale',
      selectedValue: 10,
    })).rejects.toThrow('Selected value must be between 1 and 5 for question');

    // 4. Unknown questions and attempts are reported as not found
    await expect(saveResponse(attempt.id, '00000000-0000-0000-0000-000000000000', {
      questionType: 'multiple-choice',
      selectedOptionIndex: 0,
    })).rejects.toThrow(NotFoundError);

    await expect(saveResponse('00000000-0000-0000-0000-000000000000', mcqQuestion.id, {
      questionType: 'multiple-choice',
      selectedOptionIndex: 0,
    })).rejects.toThrow(NotFoundError);
  });

  it('clears columns belonging to the previous answer type', async () => {
    const { attempt, mcqQuestion } = await seed('response-type-change@example.com');

    await saveResponse(attempt.id, mcqQuestion.id, {
      questionType: 'multiple-choice',
      selectedOptionIndex: 1,
    });

    // The question was re-typed after being answered; the stale selected_option
    // must not survive alongside the new answer.
    const reTyped = await saveResponse(attempt.id, mcqQuestion.id, {
      questionType: 'open-ended',
      response: 'Now a free text answer',
    });

    expect(reTyped.responseType).toBe('open-ended');
    expect(reTyped.response).toBe('Now a free text answer');
    expect(reTyped.selectedOption).toBeNull();
    expect(reTyped.choice).toBeNull();
    expect(reTyped.rating).toBeNull();
  });

  it('collapses concurrent saves of the same answer into one row', async () => {
    const { attempt, mcqQuestion } = await seed('response-concurrent@example.com');

    // What an undebounced client produces: several overlapping saves of the
    // same question. Before responses_attempt_question_unique these each
    // inserted their own row.
    await Promise.all([0, 1, 0, 1, 0].map((selectedOptionIndex) =>
      saveResponse(attempt.id, mcqQuestion.id, {
        questionType: 'multiple-choice',
        selectedOptionIndex,
      })
    ));

    const stored = await db.select().from(responses).where(eq(responses.attemptId, attempt.id));
    expect(stored).toHaveLength(1);
    expect([0, 1]).toContain(stored[0].selectedOption);
  });
});
