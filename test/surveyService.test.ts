import { describe, it, expect } from 'vitest';
import { db } from '../libs/db';
import { users, surveys, questions, attempts, responses } from '../libs/db/schema';
import { getAllSurveysForUser, getSurvey, createSurvey, editSurvey, deleteSurvey, getOptionSelectionCountForQuestion, getLikertScaleRatingCountForQuestion, getBinaryChoiceCountForQuestion, getSurveySummary } from '../libs/services/surveyService';
import { NotFoundError } from '../libs/models/Errors/notFoundError';

describe('surveyService', () => {
  it('should create, get, edit, and delete surveys on a live database', async () => {
    // 1. Seed a user
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      password: 'hashed-password',
    }).returning();

    const userId = user.id;

    // 2. Test createSurvey
    const createResult = await createSurvey('Test Survey', 'Test Description', userId);
    expect(createResult.title).toBe('Test Survey');
    expect(createResult.description).toBe('Test Description');
    expect(createResult.id).toBeDefined();

    const surveyId = createResult.id;

    // 3. Test getSurvey
    const getResult = await getSurvey(surveyId);
    expect(getResult.title).toBe('Test Survey');
    expect(getResult.id).toBe(surveyId);

    // 4. Test getSurvey not found
    await expect(getSurvey('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);

    // 5. Test getAllSurveysForUser
    const allSurveys = await getAllSurveysForUser(userId);
    expect(allSurveys).toHaveLength(1);
    expect(allSurveys[0].id).toBe(surveyId);

    // 6. Test editSurvey
    const editResult = await editSurvey(surveyId, userId, 'Updated Title', 'Updated Desc');
    expect(editResult.title).toBe('Updated Title');
    expect(editResult.description).toBe('Updated Desc');

    // 7. Test editSurvey not found / wrong user
    await expect(editSurvey('00000000-0000-0000-0000-000000000000', userId, 'T', 'D')).rejects.toThrow(NotFoundError);
    
    // Seed another user to test wrong user access
    const [otherUser] = await db.insert(users).values({
      email: 'other@example.com',
      password: 'password',
    }).returning();
    
    await expect(editSurvey(surveyId, otherUser.id, 'T', 'D')).rejects.toThrow(NotFoundError);

    // 8. Test deleteSurvey
    const deleteResult = await deleteSurvey(surveyId, userId);
    expect(deleteResult).toBe(true);

    // Verify deleted
    await expect(getSurvey(surveyId)).rejects.toThrow(NotFoundError);
  });

  it('should group responses by selectedOption and calculate sum of how many times each option was selected', async () => {
    // 1. Seed user
    const [user] = await db.insert(users).values({
      email: 'stats@example.com',
      password: 'password',
    }).returning();

    // 2. Seed survey
    const [survey] = await db.insert(surveys).values({
      title: 'Stats Survey',
      description: 'Calculating counts',
      userId: user.id,
    }).returning();

    // 3. Seed Multiple-Choice Question
    const [mcq] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'Which is best?',
      questionType: 'multiple-choice',
      options: ['Option A', 'Option B', 'Option C'],
    }).returning();

    const [attempt1] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();
    await db.insert(responses).values({
      attemptId: attempt1.id,
      questionId: mcq.id,
      responseType: 'multiple-choice',
      selectedOption: 0,
    });

    const [attempt2] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();
    await db.insert(responses).values({
      attemptId: attempt2.id,
      questionId: mcq.id,
      responseType: 'multiple-choice',
      selectedOption: 0,
    });

    const [attempt3] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();
    await db.insert(responses).values({
      attemptId: attempt3.id,
      questionId: mcq.id,
      responseType: 'multiple-choice',
      selectedOption: 1,
    });

    // Invoke the function
    const results = await getOptionSelectionCountForQuestion(mcq.id);

    // Assert results
    expect(results).toHaveLength(3);
    
    const optA = results.find(r => r.optionIndex === 0);
    const optB = results.find(r => r.optionIndex === 1);
    const optC = results.find(r => r.optionIndex === 2);

    expect(optA).toBeDefined();
    expect(optA?.optionText).toBe('Option A');
    expect(optA?.count).toBe(2);

    expect(optB).toBeDefined();
    expect(optB?.optionText).toBe('Option B');
    expect(optB?.count).toBe(1);

    expect(optC).toBeDefined();
    expect(optC?.optionText).toBe('Option C');
    expect(optC?.count).toBe(0);
  });

  it('should group responses by rating and calculate sum of how many times each rating (1-5) was selected', async () => {
    // 1. Seed user
    const [user] = await db.insert(users).values({
      email: 'likert@example.com',
      password: 'password',
    }).returning();

    // 2. Seed survey
    const [survey] = await db.insert(surveys).values({
      title: 'Likert Survey',
      description: 'Calculating likert stats',
      userId: user.id,
    }).returning();

    // 3. Seed Likert Scale Question
    const [likert] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'Rate your satisfaction',
      questionType: 'likert-scale',
      positiveLabel: 'High',
      negativeLabel: 'Low',
    }).returning();

    // Seed responses
    // Attempt 1: Rating 5
    const [attempt1] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();
    await db.insert(responses).values({
      attemptId: attempt1.id,
      questionId: likert.id,
      responseType: 'likert-scale',
      rating: 5,
    });

    // Attempt 2: Rating 5
    const [attempt2] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();
    await db.insert(responses).values({
      attemptId: attempt2.id,
      questionId: likert.id,
      responseType: 'likert-scale',
      rating: 5,
    });

    // Attempt 3: Rating 2
    const [attempt3] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();
    await db.insert(responses).values({
      attemptId: attempt3.id,
      questionId: likert.id,
      responseType: 'likert-scale',
      rating: 2,
    });

    // Invoke function
    const results = await getLikertScaleRatingCountForQuestion(likert.id);

    // Assert counts
    expect(results).toHaveLength(5);

    const r1 = results.find(r => r.rating === 1);
    const r2 = results.find(r => r.rating === 2);
    const r3 = results.find(r => r.rating === 3);
    const r4 = results.find(r => r.rating === 4);
    const r5 = results.find(r => r.rating === 5);

    expect(r1?.count).toBe(0);
    expect(r2?.count).toBe(1);
    expect(r3?.count).toBe(0);
    expect(r4?.count).toBe(0);
    expect(r5?.count).toBe(2);
  });

  it('should group responses by choice and calculate sum of how many times each option was selected for binary choice questions', async () => {
    // 1. Seed user
    const [user] = await db.insert(users).values({
      email: 'binary@example.com',
      password: 'password',
    }).returning();

    // 2. Seed survey
    const [survey] = await db.insert(surveys).values({
      title: 'Binary Survey',
      description: 'Calculating binary stats',
      userId: user.id,
    }).returning();

    // 3. Seed Binary Choice Question
    const [binary] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'Do you agree?',
      questionType: 'binary-choice',
      positiveLabel: 'Agree',
      negativeLabel: 'Disagree',
    }).returning();

    // Seed responses
    // Attempt 1: True (positive)
    const [attempt1] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();
    await db.insert(responses).values({
      attemptId: attempt1.id,
      questionId: binary.id,
      responseType: 'binary-choice',
      choice: true,
    });

    // Attempt 2: True (positive)
    const [attempt2] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();
    await db.insert(responses).values({
      attemptId: attempt2.id,
      questionId: binary.id,
      responseType: 'binary-choice',
      choice: true,
    });

    // Attempt 3: False (negative)
    const [attempt3] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();
    await db.insert(responses).values({
      attemptId: attempt3.id,
      questionId: binary.id,
      responseType: 'binary-choice',
      choice: false,
    });

    // Invoke function
    const results = await getBinaryChoiceCountForQuestion(binary.id);

    // Assert counts
    expect(results).toHaveLength(2);

    const pos = results.find(r => r.choice === 'positive');
    const neg = results.find(r => r.choice === 'negative');

    expect(pos?.label).toBe('Agree');
    expect(pos?.count).toBe(2);

    expect(neg?.label).toBe('Disagree');
    expect(neg?.count).toBe(1);
  });

  it('should calculate the summary of each question in a survey by id', async () => {
    // 1. Seed user
    const [user] = await db.insert(users).values({
      email: 'summary@example.com',
      password: 'password',
    }).returning();

    // 2. Seed survey
    const [survey] = await db.insert(surveys).values({
      title: 'Full Survey',
      description: 'A survey with all question types',
      userId: user.id,
    }).returning();

    // 3. Seed all question types
    const [mcq] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'What flavor?',
      questionType: 'multiple-choice',
      options: ['Vanilla', 'Chocolate', 'Strawberry'],
    }).returning();

    const [binary] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'Do you like ice cream?',
      questionType: 'binary-choice',
      positiveLabel: 'Yes',
      negativeLabel: 'No',
    }).returning();

    const [likert] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'Rate your satisfaction',
      questionType: 'likert-scale',
      positiveLabel: 'Very Good',
      negativeLabel: 'Very Bad',
    }).returning();

    const [openEnded] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'Any suggestions?',
      questionType: 'open-ended',
    }).returning();

    // 4. Seed responses
    const [attempt] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
    }).returning();

    // MCQ responses
    await db.insert(responses).values({
      attemptId: attempt.id,
      questionId: mcq.id,
      responseType: 'multiple-choice',
      selectedOption: 0,
    });
    await db.insert(responses).values({
      attemptId: attempt.id,
      questionId: mcq.id,
      responseType: 'multiple-choice',
      selectedOption: 1,
    });
    await db.insert(responses).values({
      attemptId: attempt.id,
      questionId: mcq.id,
      responseType: 'multiple-choice',
      selectedOption: 1,
    });

    // Binary responses
    await db.insert(responses).values({
      attemptId: attempt.id,
      questionId: binary.id,
      responseType: 'binary-choice',
      choice: true,
    });
    await db.insert(responses).values({
      attemptId: attempt.id,
      questionId: binary.id,
      responseType: 'binary-choice',
      choice: false,
    });

    // Likert responses
    await db.insert(responses).values({
      attemptId: attempt.id,
      questionId: likert.id,
      responseType: 'likert-scale',
      rating: 4,
    });
    await db.insert(responses).values({
      attemptId: attempt.id,
      questionId: likert.id,
      responseType: 'likert-scale',
      rating: 5,
    });

    // Open Ended responses
    await db.insert(responses).values({
      attemptId: attempt.id,
      questionId: openEnded.id,
      responseType: 'open-ended',
      response: 'Great service!',
    });
    await db.insert(responses).values({
      attemptId: attempt.id,
      questionId: openEnded.id,
      responseType: 'open-ended',
      response: 'Loved the options.',
    });

    // 5. Invoke getSurveySummary
    const summaryResult = await getSurveySummary(survey.id);

    // 6. Assertions
    expect(summaryResult.id).toBe(survey.id);
    expect(summaryResult.title).toBe('Full Survey');
    expect(summaryResult.description).toBe('A survey with all question types');
    expect(summaryResult.questions).toHaveLength(4);

    // MC options check (Vanilla: 1, Chocolate: 2, Strawberry: 0)
    const mcqSummary = summaryResult.questions[0] as any;
    expect(mcqSummary.result).toBeDefined();
    expect(mcqSummary.result).toEqual([
      { option: 'Vanilla', count: 1 },
      { option: 'Chocolate', count: 2 },
      { option: 'Strawberry', count: 0 },
    ]);

    // Binary check (Yes: 1, No: 1)
    const binarySummary = summaryResult.questions[1] as any;
    expect(binarySummary.yesCount).toBe(1);
    expect(binarySummary.noCount).toBe(1);

    // Likert check (Rating 4: 1, Rating 5: 1, others: 0)
    const likertSummary = summaryResult.questions[2] as any;
    expect(likertSummary.result).toEqual([
      { options: 1, count: 0 },
      { options: 2, count: 0 },
      { options: 3, count: 0 },
      { options: 4, count: 1 },
      { options: 5, count: 1 },
    ]);

    // Open-ended check
    const openSummary = summaryResult.questions[3] as any;
    expect(openSummary.summary).toContain('Great service!');
    expect(openSummary.summary).toContain('Loved the options.');
  });
});