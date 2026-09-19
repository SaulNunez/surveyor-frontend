import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../libs/db';
import { users, surveys } from '../libs/db/schema';
import { createAnonymousUserForSurvey } from '../libs/services/auth/anonymousAccountService';
import { InvalidOperationError } from '../libs/models/Errors/invalidOperationError';
import { NotFoundError } from '../libs/models/Errors/notFoundError';
import { generateSurveyPublicId } from '../libs/db/publicId';

async function seedSurvey(openToAnyone: boolean) {
  const [owner] = await db.insert(users).values({
    email: `owner-${generateSurveyPublicId()}@example.com`,
    password: 'password',
  }).returning();

  const [survey] = await db.insert(surveys).values({
    publicId: generateSurveyPublicId(),
    title: 'Survey',
    description: 'Desc',
    userId: owner.id,
    openToAnyone,
  }).returning();

  return survey;
}

async function countUsers() {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(users);
  return total;
}

describe('anonymousAccountService', () => {
  it('should mint a guest for a survey that is open to anyone', async () => {
    const survey = await seedSurvey(true);

    const guest = await createAnonymousUserForSurvey(survey.publicId);

    expect(guest.isAnonymous).toBe(true);
    expect(guest.email).toBeNull();
  });

  it('should mint nothing at all for a survey that requires an account', async () => {
    const survey = await seedSurvey(false);
    const before = await countUsers();

    await expect(createAnonymousUserForSurvey(survey.publicId))
      .rejects.toThrow(InvalidOperationError);

    // The survey is checked before the insert, not after, so a refused request
    // cannot leave a stray account behind.
    expect(await countUsers()).toBe(before);
  });

  it('should mint nothing for a survey that does not exist', async () => {
    const before = await countUsers();

    await expect(createAnonymousUserForSurvey('ZZZZZZ')).rejects.toThrow(NotFoundError);

    expect(await countUsers()).toBe(before);
  });
});
