import { describe, it, expect } from 'vitest';
import { db } from '../libs/db';
import { users, surveys, attempts } from '../libs/db/schema';
import { createNewAttempt, deleteExistingAttempt, completeExistingAttempt, getExistingAttempt } from '../libs/services/attemptService';
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

    // 2. Test: No attempt exists. getExistingAttempt throws NotFoundError
    await expect(getExistingAttempt(survey.id, user.id)).rejects.toThrow(NotFoundError);

    // 3. Test: No attempt exists. createNewAttempt also throws NotFoundError because of getLatestAttempt
    await expect(createNewAttempt(survey.id, user.id)).rejects.toThrow(NotFoundError);

    // 4. Manually seed an active/uncompleted attempt in the DB
    const [activeAttempt] = await db.insert(attempts).values({
      surveyId: survey.id,
      userId: user.id,
      startedAt: new Date(),
    }).returning();

    // 5. Test getExistingAttempt when active attempt exists
    const existing = await getExistingAttempt(survey.id, user.id);
    expect(existing).not.toBeNull();
    expect(existing!.id).toBe(activeAttempt.id);

    // 6. Test createNewAttempt when active attempt exists (should create a NEW one, since latest is not completed)
    const newAttempt = await createNewAttempt(survey.id, user.id);
    expect(newAttempt.id).not.toBe(activeAttempt.id);

    // 7. Test getExistingAttempt when latest attempt is completed
    // First, complete the latest attempt (newAttempt)
    const completed = await completeExistingAttempt(newAttempt.id, user.id);
    expect(completed).not.toBeNull();
    expect(completed!.completedAt).toBeDefined();

    // Now getExistingAttempt should return null because the latest attempt is completed
    const existingAfterCompletion = await getExistingAttempt(survey.id, user.id);
    expect(existingAfterCompletion).toBeNull();

    // 8. Test createNewAttempt when latest attempt is completed (should return the completed attempt details)
    const createdAfterCompletion = await createNewAttempt(survey.id, user.id);
    expect(createdAfterCompletion.id).toBe(newAttempt.id);

    // 9. Test completeExistingAttempt when already completed (should return null)
    const completeAgain = await completeExistingAttempt(newAttempt.id, user.id);
    expect(completeAgain).toBeNull();

    // 10. Test deleteExistingAttempt for completed attempt (should throw InvalidOperationError)
    await expect(deleteExistingAttempt(newAttempt.id, user.id)).rejects.toThrow(InvalidOperationError);

    // 11. Test deleteExistingAttempt for active attempt
    const deleteResult = await deleteExistingAttempt(activeAttempt.id, user.id);
    expect(deleteResult).toBe(true);

    // Verify deleted
    await expect(deleteExistingAttempt(activeAttempt.id, user.id)).rejects.toThrow(NotFoundError);
  });
});