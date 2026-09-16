import { describe, it, expect } from 'vitest';
import { db } from '../libs/db';
import { users, surveys, questions, attempts, responses, questionSummaries } from '../libs/db/schema';
import { eq } from 'drizzle-orm';
import {
  generateSummaryForQuestion,
  getSummaryForQuestion,
  getOpenEndedResponses,
} from '../libs/services/questionSummaryService';
import { SummaryProvider } from '../libs/services/ai';
import { NotFoundError } from '../libs/models/Errors/notFoundError';
import { InvalidOperationError } from '../libs/models/Errors/invalidOperationError';

/**
 * A provider that records what it was asked and returns a canned summary, so
 * the whole service path runs against the real database without reaching a
 * real LLM.
 */
function stubProvider(summary = 'Most respondents mentioned **pricing**.') {
  const calls: { questionText: string; responses: string[]; total: number }[] = [];
  const provider: SummaryProvider = {
    name: 'stub',
    model: 'stub-model',
    async summarize(questionText, responsesArg, totalResponseCount) {
      calls.push({ questionText, responses: responsesArg, total: totalResponseCount });
      return summary;
    },
  };
  return { provider, calls };
}

async function seedSurveyWithOpenEndedQuestion(ownerEmail = 'owner@example.com') {
  const [owner] = await db.insert(users).values({
    email: ownerEmail,
    password: 'hashed-password',
  }).returning();

  const [survey] = await db.insert(surveys).values({
    title: 'Feedback',
    description: 'Tell us what you think',
    userId: owner.id,
  }).returning();

  const [question] = await db.insert(questions).values({
    surveyId: survey.id,
    text: 'What could we do better?',
    questionType: 'open-ended',
  }).returning();

  return { owner, survey, question };
}

/**
 * Each answer comes from a different respondent: a user may only have one
 * in-progress attempt per survey.
 */
async function seedAnswer(surveyId: string, questionId: string, email: string, response: string) {
  const [respondent] = await db.insert(users).values({
    email,
    password: 'password',
  }).returning();

  const [attempt] = await db.insert(attempts).values({
    surveyId,
    userId: respondent.id,
  }).returning();

  await db.insert(responses).values({
    attemptId: attempt.id,
    questionId,
    responseType: 'open-ended',
    response,
  });
}

describe('questionSummaryService', () => {
  it('should generate and persist a summary of an open-ended question', async () => {
    const { owner, survey, question } = await seedSurveyWithOpenEndedQuestion();
    await seedAnswer(survey.id, question.id, 'a@example.com', 'The pricing is too high.');
    await seedAnswer(survey.id, question.id, 'b@example.com', 'Pricing, mostly. Also the docs.');

    const { provider, calls } = stubProvider();

    const result = await generateSummaryForQuestion(survey.publicId, question.id, owner.id, provider);

    expect(result.summary).toBe('Most respondents mentioned **pricing**.');
    expect(result.provider).toBe('stub');
    expect(result.model).toBe('stub-model');
    expect(result.responseCount).toBe(2);
    expect(result.generatedAt).toBeInstanceOf(Date);

    // The provider saw the question text and both answers.
    expect(calls).toHaveLength(1);
    expect(calls[0].questionText).toBe('What could we do better?');
    expect(calls[0].responses).toHaveLength(2);
    expect(calls[0].total).toBe(2);

    // And it was persisted.
    const stored = await getSummaryForQuestion(question.id);
    expect(stored?.summary).toBe('Most respondents mentioned **pricing**.');
    expect(stored?.responseCount).toBe(2);
  });

  it('should upsert rather than duplicate when regenerating', async () => {
    const { owner, survey, question } = await seedSurveyWithOpenEndedQuestion();
    await seedAnswer(survey.id, question.id, 'a@example.com', 'The pricing is too high.');

    const first = stubProvider('First pass.');
    await generateSummaryForQuestion(survey.publicId, question.id, owner.id, first.provider);

    // A new answer arrives, then the owner regenerates.
    await seedAnswer(survey.id, question.id, 'b@example.com', 'Docs need work.');
    const second = stubProvider('Second pass.');
    const regenerated = await generateSummaryForQuestion(survey.publicId, question.id, owner.id, second.provider);

    expect(regenerated.summary).toBe('Second pass.');
    expect(regenerated.responseCount).toBe(2);

    const rows = await db.select()
      .from(questionSummaries)
      .where(eq(questionSummaries.questionId, question.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].summary).toBe('Second pass.');
  });

  it('should reject a question belonging to another user as not found', async () => {
    const { survey, question } = await seedSurveyWithOpenEndedQuestion();
    await seedAnswer(survey.id, question.id, 'a@example.com', 'Some feedback.');

    const [otherUser] = await db.insert(users).values({
      email: 'intruder@example.com',
      password: 'password',
    }).returning();

    const { provider, calls } = stubProvider();

    await expect(
      generateSummaryForQuestion(survey.publicId, question.id, otherUser.id, provider)
    ).rejects.toThrow(NotFoundError);

    // Ownership is checked before anything is spent.
    expect(calls).toHaveLength(0);
  });

  it('should reject a question that does not belong to the survey in the path', async () => {
    const { owner, survey, question } = await seedSurveyWithOpenEndedQuestion();
    await seedAnswer(survey.id, question.id, 'a@example.com', 'Some feedback.');

    const [otherSurvey] = await db.insert(surveys).values({
      title: 'Another survey',
      description: 'Unrelated',
      userId: owner.id,
    }).returning();

    const { provider } = stubProvider();

    await expect(
      generateSummaryForQuestion(otherSurvey.publicId, question.id, owner.id, provider)
    ).rejects.toThrow(NotFoundError);
  });

  it('should reject a question that is not open-ended', async () => {
    const { owner, survey } = await seedSurveyWithOpenEndedQuestion();

    const [likert] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'How satisfied are you?',
      questionType: 'likert-scale',
      positiveLabel: 'Very',
      negativeLabel: 'Not at all',
    }).returning();

    const { provider, calls } = stubProvider();

    await expect(
      generateSummaryForQuestion(survey.publicId, likert.id, owner.id, provider)
    ).rejects.toThrow(InvalidOperationError);
    expect(calls).toHaveLength(0);
  });

  it('should refuse to summarize a question with no responses', async () => {
    const { owner, survey, question } = await seedSurveyWithOpenEndedQuestion();

    const { provider, calls } = stubProvider();

    await expect(
      generateSummaryForQuestion(survey.publicId, question.id, owner.id, provider)
    ).rejects.toThrow(InvalidOperationError);
    // No tokens spent on an empty question.
    expect(calls).toHaveLength(0);
  });

  it('should ignore blank responses when collecting answers', async () => {
    const { owner, survey, question } = await seedSurveyWithOpenEndedQuestion();
    await seedAnswer(survey.id, question.id, 'a@example.com', '   ');
    await seedAnswer(survey.id, question.id, 'b@example.com', '  Real feedback.  ');

    const collected = await getOpenEndedResponses(question.id);
    expect(collected).toEqual(['Real feedback.']);

    const { provider } = stubProvider();
    const result = await generateSummaryForQuestion(survey.publicId, question.id, owner.id, provider);
    expect(result.responseCount).toBe(1);
  });

  it('should return null for a question with no stored summary', async () => {
    const { question } = await seedSurveyWithOpenEndedQuestion();
    expect(await getSummaryForQuestion(question.id)).toBeNull();
  });
});
