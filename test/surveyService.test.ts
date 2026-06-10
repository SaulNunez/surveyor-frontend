import { describe, it, expect } from 'vitest';
import { db } from '../libs/db';
import { users } from '../libs/db/schema';
import { getAllSurveysForUser, getSurvey, createSurvey, editSurvey, deleteSurvey } from '../libs/services/surveyService';
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
});