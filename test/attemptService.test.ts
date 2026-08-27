import { describe, it, expect } from 'vitest';
import { db } from '../libs/db';
import { eq } from 'drizzle-orm';
import { users, surveys, attempts } from '../libs/db/schema';
import { createNewAttempt, deleteExistingAttempt, completeExistingAttempt, getExistingAttempt, restartAttempt } from '../libs/services/attemptService';
import { NotFoundError } from '../libs/models/Errors/notFoundError';
import { InvalidOperationError } from '../libs/models/Errors/invalidOperationError';

describe('attemptService', () => {
  it('should manage attempts on a live database', async () => {
    // 1. Seed user and survey
    const [user] = await db.insert(users).values({
      email: 'attempt@example.com',
      password: 'password',
    }).returning();

    const [survey] = await db.insert(surveys).values({
      title: 'Survey for Attempt',
      description: 'Desc',
      userId: user.id,
    }).returning();

    // 2. No attempt exists yet, so there is nothing to resume
    expect(await getExistingAttempt(survey.id, user.id)).toBeNull();

    // 3. createNewAttempt starts the first attempt
    const firstAttempt = await createNewAttempt(survey.id, user.id);
    expect(firstAttempt.id).toBeDefined();
    expect(firstAttempt.survey).toBe(survey.id);

    // 4. That attempt is now the one to resume
    const existing = await getExistingAttempt(survey.id, user.id);
    expect(existing).not.toBeNull();
    expect(existing!.id).toBe(firstAttempt.id);

    // 5. Calling createNewAttempt again resumes it rather than starting over
    const resumed = await createNewAttempt(survey.id, user.id);
    expect(resumed.id).toBe(firstAttempt.id);
    const allAttempts = await db.select().from(attempts).where(eq(attempts.surveyId, survey.id));
    expect(allAttempts).toHaveLength(1);

    // 6. Completing it means there is nothing left to resume
    const completed = await completeExistingAttempt(firstAttempt.id, user.id);
    expect(completed).not.toBeNull();
    expect(completed!.completedAt).toBeDefined();
    expect(await getExistingAttempt(survey.id, user.id)).toBeNull();

    // 7. Once the latest attempt is completed, a new one is started
    const secondAttempt = await createNewAttempt(survey.id, user.id);
    expect(secondAttempt.id).not.toBe(firstAttempt.id);

    // 8. completeExistingAttempt on an already completed attempt returns null
    expect(await completeExistingAttempt(firstAttempt.id, user.id)).toBeNull();

    // 9. A completed attempt cannot be deleted
    await expect(deleteExistingAttempt(firstAttempt.id, user.id)).rejects.toThrow(InvalidOperationError);

    // 10. Starting over: delete the in-progress attempt, then create a fresh one
    expect(await deleteExistingAttempt(secondAttempt.id, user.id)).toBe(true);
    await expect(deleteExistingAttempt(secondAttempt.id, user.id)).rejects.toThrow(NotFoundError);

    const restarted = await createNewAttempt(survey.id, user.id);
    expect(restarted.id).not.toBe(secondAttempt.id);
    expect(restarted.id).not.toBe(firstAttempt.id);

    // 11. Another user cannot touch this user's attempt
    const [otherUser] = await db.insert(users).values({
      email: 'other@example.com',
      password: 'password',
    }).returning();
    await expect(deleteExistingAttempt(restarted.id, otherUser.id)).rejects.toThrow(NotFoundError);
  });

  it('starts only one attempt when saves arrive concurrently', async () => {
    const [user] = await db.insert(users).values({
      email: 'attempt-concurrent@example.com',
      password: 'password',
    }).returning();

    const [survey] = await db.insert(surveys).values({
      title: 'Survey for Concurrent Attempts',
      description: 'Desc',
      userId: user.id,
    }).returning();

    // Several saves racing to start the first attempt. Before the partial
    // unique index each of these inserted its own attempt row.
    const started = await Promise.all(
      Array.from({ length: 5 }, () => createNewAttempt(survey.id, user.id))
    );

    const ids = new Set(started.map(attempt => attempt.id));
    expect(ids.size).toBe(1);

    const stored = await db.select().from(attempts).where(eq(attempts.surveyId, survey.id));
    expect(stored).toHaveLength(1);
  });

  it('restarts an attempt atomically', async () => {
    const [user] = await db.insert(users).values({
      email: 'attempt-restart@example.com',
      password: 'password',
    }).returning();

    const [survey] = await db.insert(surveys).values({
      title: 'Survey for Restart',
      description: 'Desc',
      userId: user.id,
    }).returning();

    const original = await createNewAttempt(survey.id, user.id);
    const restarted = await restartAttempt(survey.id, user.id);

    expect(restarted.id).not.toBe(original.id);

    // The discarded attempt is gone and exactly one in-progress attempt remains.
    const stored = await db.select().from(attempts).where(eq(attempts.surveyId, survey.id));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(restarted.id);

    // Restarting with nothing in progress simply starts one.
    await completeExistingAttempt(restarted.id, user.id);
    const afterCompletion = await restartAttempt(survey.id, user.id);
    expect(afterCompletion.id).not.toBe(restarted.id);
  });
});
