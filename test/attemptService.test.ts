import { describe, it, expect } from 'vitest';
import { db } from '../libs/db';
import { eq } from 'drizzle-orm';
import { users, surveys, attempts } from '../libs/db/schema';
import { createNewAttempt, deleteExistingAttempt, completeExistingAttempt, getExistingAttempt, restartAttempt } from '../libs/services/attemptService';
import { createAnonymousUser } from '../libs/services/auth/userService';
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
    expect(await getExistingAttempt(survey.publicId, user.id)).toBeNull();

    // 3. createNewAttempt starts the first attempt
    const firstAttempt = await createNewAttempt(survey.publicId, user.id);
    expect(firstAttempt.id).toBeDefined();
    expect(firstAttempt.survey).toBe(survey.publicId);

    // 4. That attempt is now the one to resume
    const existing = await getExistingAttempt(survey.publicId, user.id);
    expect(existing).not.toBeNull();
    expect(existing!.id).toBe(firstAttempt.id);

    // 5. Calling createNewAttempt again resumes it rather than starting over
    const resumed = await createNewAttempt(survey.publicId, user.id);
    expect(resumed.id).toBe(firstAttempt.id);
    const allAttempts = await db.select().from(attempts).where(eq(attempts.surveyId, survey.id));
    expect(allAttempts).toHaveLength(1);

    // 6. Completing it means there is nothing left to resume
    const completed = await completeExistingAttempt(firstAttempt.id, user.id);
    expect(completed).not.toBeNull();
    expect(completed!.completedAt).toBeDefined();
    expect(await getExistingAttempt(survey.publicId, user.id)).toBeNull();

    // 7. Once the latest attempt is completed, a new one is started
    const secondAttempt = await createNewAttempt(survey.publicId, user.id);
    expect(secondAttempt.id).not.toBe(firstAttempt.id);

    // 8. completeExistingAttempt on an already completed attempt returns null
    expect(await completeExistingAttempt(firstAttempt.id, user.id)).toBeNull();

    // 9. A completed attempt cannot be deleted
    await expect(deleteExistingAttempt(firstAttempt.id, user.id)).rejects.toThrow(InvalidOperationError);

    // 10. Starting over: delete the in-progress attempt, then create a fresh one
    expect(await deleteExistingAttempt(secondAttempt.id, user.id)).toBe(true);
    await expect(deleteExistingAttempt(secondAttempt.id, user.id)).rejects.toThrow(NotFoundError);

    const restarted = await createNewAttempt(survey.publicId, user.id);
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
      Array.from({ length: 5 }, () => createNewAttempt(survey.publicId, user.id))
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

    const original = await createNewAttempt(survey.publicId, user.id);
    const restarted = await restartAttempt(survey.publicId, user.id);

    expect(restarted.id).not.toBe(original.id);

    // The discarded attempt is gone and exactly one in-progress attempt remains.
    const stored = await db.select().from(attempts).where(eq(attempts.surveyId, survey.id));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(restarted.id);

    // Restarting with nothing in progress simply starts one.
    await completeExistingAttempt(restarted.id, user.id);
    const afterCompletion = await restartAttempt(survey.publicId, user.id);
    expect(afterCompletion.id).not.toBe(restarted.id);
  });

  it('should treat a guest account like any other respondent', async () => {
    // Guests are ordinary `users` rows, so nothing in this service — including
    // the partial index that allows one in-progress attempt per person — needs
    // to know the difference.
    const [owner] = await db.insert(users).values({
      email: 'owner@example.com',
      password: 'password',
    }).returning();

    const [survey] = await db.insert(surveys).values({
      title: 'Open Survey',
      description: 'Desc',
      userId: owner.id,
      openToAnyone: true,
    }).returning();

    const guest = await createAnonymousUser();
    const otherGuest = await createAnonymousUser();

    const attempt = await createNewAttempt(survey.publicId, guest.id);
    expect(attempt.survey).toBe(survey.publicId);

    // A second save resumes the same attempt rather than starting another.
    expect((await createNewAttempt(survey.publicId, guest.id)).id).toBe(attempt.id);

    // A different guest is a different respondent with their own attempt.
    const otherAttempt = await createNewAttempt(survey.publicId, otherGuest.id);
    expect(otherAttempt.id).not.toBe(attempt.id);

    // And once submitted, a guest can start a fresh one.
    await completeExistingAttempt(attempt.id, guest.id);
    expect(await getExistingAttempt(survey.publicId, guest.id)).toBeNull();
    expect((await createNewAttempt(survey.publicId, guest.id)).id).not.toBe(attempt.id);

    const guestAttempts = await db.select().from(attempts).where(eq(attempts.userId, guest.id));
    expect(guestAttempts).toHaveLength(2);
  });
});
