import { describe, it, expect } from 'vitest';
import { db } from '../libs/db';
import { users, surveys, questions } from '../libs/db/schema';
import { createQuestion, editQuestion, deleteQuestion, getQuestionsForSurvey } from '../libs/services/questionService';
import { eq } from 'drizzle-orm';

describe('questionService', () => {
  it('should manage questions on a live database', async () => {
    // 1. Seed user and survey
    const [user] = await db.insert(users).values({
      email: 'question@example.com',
      password: 'password',
    }).returning();

    const [survey] = await db.insert(surveys).values({
      title: 'Survey for Questions',
      description: 'Desc',
      userId: user.id,
    }).returning();

    // 2. Test: create multiple-choice question
    await createQuestion(survey.id, {
      questionType: 'multiple-choice',
      title: 'MCQ Question',
      options: ['Option A', 'Option B'],
    });

    // Verify it exists in DB
    const mcqs = await db.select().from(questions).where(eq(questions.surveyId, survey.id));
    expect(mcqs).toHaveLength(1);
    expect(mcqs[0].text).toBe('MCQ Question');
    expect(mcqs[0].options).toEqual(['Option A', 'Option B']);

    const questionId = mcqs[0].id;

    // 3. Test: edit question
    await editQuestion(survey.id, questionId, {
      questionType: 'binary-choice',
      title: 'Binary Question',
      positiveLabel: 'Yes',
      negativeLabel: 'No',
    });

    const updatedQs = await db.select().from(questions).where(eq(questions.id, questionId));
    expect(updatedQs[0].text).toBe('Binary Question');
    expect(updatedQs[0].questionType).toBe('binary-choice');
    expect(updatedQs[0].positiveLabel).toBe('Yes');
    expect(updatedQs[0].negativeLabel).toBe('No');
    expect(updatedQs[0].options).toBeNull(); // Should reset old mcq options

    // 4. Test: delete question
    await deleteQuestion(survey.id, questionId);
    const deletedQs = await db.select().from(questions).where(eq(questions.id, questionId));
    expect(deletedQs).toHaveLength(0);

    // 5. Test: get questions for survey
    await createQuestion(survey.id, {
      questionType: 'open-ended',
      title: 'Open ended Q',
    });
    await createQuestion(survey.id, {
      questionType: 'multiple-choice',
      title: 'MCQ Q',
      options: ['Option 1', 'Option 2'],
    });

    const surveyQuestions = await getQuestionsForSurvey(survey.id);
    expect(surveyQuestions).toHaveLength(2);
    expect(surveyQuestions[0].title).toBe('Open ended Q');
    expect(surveyQuestions[1].options).toEqual(['Option 1', 'Option 2']);

    await expect(getQuestionsForSurvey('00000000-0000-0000-0000-000000000000')).rejects.toThrow('Survey not found');

    // 6. Test errors
    await expect(createQuestion('00000000-0000-0000-0000-000000000000', {
      questionType: 'open-ended',
      title: 'Open ended',
    })).rejects.toThrow('Survey not found');

    await expect(editQuestion(survey.id, '00000000-0000-0000-0000-000000000000', {
      questionType: 'open-ended',
      title: 'Open ended',
    })).rejects.toThrow('Question not found');
  });
});