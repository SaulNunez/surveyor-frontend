import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import { db } from '../libs/db';
import { users, surveys, questions, attempts } from '../libs/db/schema';
import {
  createUser,
  createAnonymousUser,
  linkAnonymousAccount,
  getUserById,
  getUserByEmail,
} from '../libs/services/auth/userService';
import { createNewAttempt } from '../libs/services/attemptService';
import { saveResponse } from '../libs/services/responseService';
import { InvalidOperationError } from '../libs/models/Errors/invalidOperationError';
import { generateSurveyPublicId } from '../libs/db/publicId';

describe('userService', () => {
  it('should create a credentialed user and hash its password', async () => {
    const user = await createUser({ email: 'new@example.com', password: 'secret' });

    expect(user.email).toBe('new@example.com');
    expect(user.isAnonymous).toBe(false);

    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row.password).not.toBe('secret');
    expect(await bcrypt.compare('secret', row.password!)).toBe(true);
  });

  it('should refuse a duplicate email instead of reporting success', async () => {
    await createUser({ email: 'taken@example.com', password: 'secret' });

    await expect(createUser({ email: 'taken@example.com', password: 'other' }))
      .rejects.toThrow(InvalidOperationError);
  });

  it('should let many anonymous users coexist without an email', async () => {
    const first = await createAnonymousUser();
    const second = await createAnonymousUser();

    expect(first.isAnonymous).toBe(true);
    expect(first.email).toBeNull();
    expect(first.displayName).toBeNull();

    // Postgres treats NULLs as distinct under UNIQUE, which is the whole
    // reason guests can share the emailless state under users_email_unique.
    expect(second.id).not.toBe(first.id);
    expect(second.isAnonymous).toBe(true);

    const [row] = await db.select().from(users).where(eq(users.id, first.id));
    expect(row.password).toBeNull();
  });

  it('should reject a user that is half credentialed', async () => {
    // The check constraint is what makes `password is null` a safe definition
    // of "anonymous": there is no row where only one of the two is set.
    await expect(
      db.insert(users).values({ email: 'half@example.com', password: null })
    ).rejects.toThrow();

    await expect(
      db.insert(users).values({ email: null, password: 'hash' })
    ).rejects.toThrow();
  });

  it('should carry a guest’s answers over when the account is claimed', async () => {
    const guest = await createAnonymousUser();

    const [owner] = await db.insert(users).values({
      email: 'owner@example.com',
      password: 'password',
    }).returning();

    const [survey] = await db.insert(surveys).values({
      publicId: generateSurveyPublicId(),
      title: 'Open Survey',
      description: 'Desc',
      userId: owner.id,
      openToAnyone: true,
    }).returning();

    const [question] = await db.insert(questions).values({
      surveyId: survey.id,
      text: 'How was it?',
      questionType: 'open-ended',
    }).returning();

    const attempt = await createNewAttempt(survey.publicId, guest.id);
    await saveResponse(attempt.id, question.id, {
      questionType: 'open-ended',
      response: 'Good',
    });

    const claimed = await linkAnonymousAccount(guest.id, 'claimed@example.com', 'secret');

    // The same row, now with credentials — which is what keeps the answers.
    expect(claimed.id).toBe(guest.id);
    expect(claimed.email).toBe('claimed@example.com');
    expect(claimed.isAnonymous).toBe(false);

    const [row] = await db.select().from(users).where(eq(users.id, guest.id));
    expect(await bcrypt.compare('secret', row.password!)).toBe(true);

    const carried = await db.select().from(attempts).where(eq(attempts.userId, guest.id));
    expect(carried).toHaveLength(1);
    expect(carried[0].id).toBe(attempt.id);
  });

  it('should refuse to claim an account that already has credentials', async () => {
    const existing = await createUser({ email: 'has@example.com', password: 'secret' });

    await expect(linkAnonymousAccount(existing.id, 'other@example.com', 'new'))
      .rejects.toThrow(InvalidOperationError);

    // Nothing was touched: the original credentials still work.
    const [row] = await db.select().from(users).where(eq(users.id, existing.id));
    expect(row.email).toBe('has@example.com');
    expect(await bcrypt.compare('secret', row.password!)).toBe(true);
  });

  it('should leave the guest usable when the email it claims is taken', async () => {
    await createUser({ email: 'first@example.com', password: 'secret' });
    const guest = await createAnonymousUser();

    await expect(linkAnonymousAccount(guest.id, 'first@example.com', 'other'))
      .rejects.toThrow(InvalidOperationError);

    // The update never committed, so the session pointing at this guest is
    // still valid and they can try a different email.
    const stillGuest = await getUserById(guest.id);
    expect(stillGuest?.isAnonymous).toBe(true);
    expect(stillGuest?.email).toBeNull();
  });

  it('should refuse to claim a user that does not exist', async () => {
    await expect(
      linkAnonymousAccount('00000000-0000-0000-0000-000000000000', 'ghost@example.com', 'secret')
    ).rejects.toThrow(InvalidOperationError);

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(users);
    expect(total).toBe(0);
  });

  it('should report isAnonymous on every read path', async () => {
    const guest = await createAnonymousUser();
    const member = await createUser({ email: 'member@example.com', password: 'secret' });

    expect((await getUserById(guest.id))?.isAnonymous).toBe(true);
    expect((await getUserById(member.id))?.isAnonymous).toBe(false);
    expect((await getUserByEmail('member@example.com'))?.isAnonymous).toBe(false);
  });
});
