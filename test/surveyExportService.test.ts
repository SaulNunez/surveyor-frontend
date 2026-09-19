import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { db } from '../libs/db';
import { users, surveys, questions, attempts, responses } from '../libs/db/schema';
import { getSurveyExportData } from '../libs/services/surveyExportService';
import { buildSurveyOds, ODS_CONTENT_TYPE } from '../libs/export/surveyOds';
import { NotFoundError } from '../libs/models/Errors/notFoundError';

type ResponseValues = Omit<typeof responses.$inferInsert, 'attemptId'>;

async function seedAttempt(surveyId: string, email: string, completed: boolean, answers: ResponseValues[]) {
  const [respondent] = await db.insert(users).values({ email, password: 'password' }).returning();
  const [attempt] = await db.insert(attempts).values({
    surveyId,
    userId: respondent.id,
    completedAt: completed ? new Date('2026-01-02T10:30:00Z') : null,
  }).returning();
  if (answers.length > 0) {
    await db.insert(responses).values(answers.map(answer => ({ ...answer, attemptId: attempt.id })));
  }
  return attempt;
}

async function seedSurvey() {
  const [owner] = await db.insert(users).values({ email: 'owner@example.com', password: 'password' }).returning();
  const [survey] = await db.insert(surveys).values({
    title: 'Export Survey',
    description: 'Desc',
    userId: owner.id,
  }).returning();

  const [open] = await db.insert(questions).values({
    surveyId: survey.id, text: 'Any comments?', questionType: 'open-ended',
  }).returning();
  const [mcq] = await db.insert(questions).values({
    surveyId: survey.id, text: 'Favourite colour?', questionType: 'multiple-choice', options: ['Red', 'Blue'],
  }).returning();
  const [binary] = await db.insert(questions).values({
    surveyId: survey.id, text: 'Would you return?', questionType: 'binary-choice',
    positiveLabel: 'Sure', negativeLabel: 'Nope',
  }).returning();
  const [likert] = await db.insert(questions).values({
    surveyId: survey.id, text: 'Rate us', questionType: 'likert-scale',
  }).returning();

  const first = await seedAttempt(survey.id, 'r1@example.com', true, [
    { questionId: open.id, responseType: 'open-ended', response: 'Great, thanks' },
    { questionId: mcq.id, responseType: 'multiple-choice', selectedOption: 0 },
    { questionId: binary.id, responseType: 'binary-choice', choice: true },
    { questionId: likert.id, responseType: 'likert-scale', rating: 4 },
  ]);
  const second = await seedAttempt(survey.id, 'r2@example.com', true, [
    // Points at an option that no longer exists.
    { questionId: mcq.id, responseType: 'multiple-choice', selectedOption: 5 },
    { questionId: binary.id, responseType: 'binary-choice', choice: false },
    { questionId: likert.id, responseType: 'likert-scale', rating: 2 },
  ]);
  const inProgress = await seedAttempt(survey.id, 'r3@example.com', false, [
    { questionId: open.id, responseType: 'open-ended', response: 'Still thinking' },
    { questionId: likert.id, responseType: 'likert-scale', rating: 5 },
  ]);

  return { owner, survey, open, mcq, binary, likert, first, second, inProgress };
}

describe('surveyExportService', () => {
  it('exports completed attempts only, with display values and summaries', async () => {
    const { owner, survey, open, mcq, binary, likert, first, second } = await seedSurvey();

    const data = await getSurveyExportData(survey.id, owner.id);

    expect(data.survey.title).toBe('Export Survey');
    expect(data.attempts.map(a => a.attemptId).sort()).toEqual([first.id, second.id].sort());

    const firstRow = data.attempts.find(a => a.attemptId === first.id)!;
    expect(firstRow.answers).toEqual({
      [open.id]: 'Great, thanks',
      [mcq.id]: 'Red',
      [binary.id]: 'Sure',
      [likert.id]: 4,
    });

    const secondRow = data.attempts.find(a => a.attemptId === second.id)!;
    expect(secondRow.answers[open.id]).toBeUndefined();
    expect(secondRow.answers[mcq.id]).toBe('Option 6');
    expect(secondRow.answers[binary.id]).toBe('Nope');

    const byId = new Map(data.questions.map(q => [q.id, q]));
    expect(byId.get(open.id)).toMatchObject({ answered: 1, rows: [] });
    expect(byId.get(mcq.id)!.rows).toEqual([
      { label: 'Red', count: 1 },
      { label: 'Blue', count: 0 },
      { label: 'Option 6', count: 1 },
    ]);
    expect(byId.get(binary.id)!.rows).toEqual([
      { label: 'Sure', count: 1 },
      { label: 'Nope', count: 1 },
    ]);
    // The in-progress rating of 5 is excluded.
    const likertSummary = byId.get(likert.id)!;
    expect(likertSummary.rows.map(r => r.count)).toEqual([0, 1, 0, 1, 0]);
    expect(likertSummary.average).toBe(3);
  });

  it('hides the survey from anyone but its owner', async () => {
    const { survey } = await seedSurvey();
    const [other] = await db.insert(users).values({ email: 'other@example.com', password: 'password' }).returning();

    await expect(getSurveyExportData(survey.id, other.id)).rejects.toThrow(NotFoundError);
    await expect(getSurveyExportData('00000000-0000-0000-0000-000000000000', other.id)).rejects.toThrow(NotFoundError);
  });

  it('builds an ods file with summary and responses sheets', async () => {
    const { owner, survey, first } = await seedSurvey();
    const data = await getSurveyExportData(survey.id, owner.id);

    const files = unzipSync(await buildSurveyOds(data));

    expect(strFromU8(files['mimetype'])).toBe(ODS_CONTENT_TYPE);
    const content = strFromU8(files['content.xml']);
    const sheetNames = [...content.matchAll(/<table:table table:name="([^"]+)"/g)].map(m => m[1]);
    expect(sheetNames).toEqual(['Summary', 'Responses']);
    expect(content).toContain('Favourite colour?');
    expect(content).toContain('Great, thanks');
    expect(content).toContain(first.id);
    expect(content).not.toContain('Still thinking');
  });
});
