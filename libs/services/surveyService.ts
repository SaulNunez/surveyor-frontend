import { NotFoundError } from "../models/Errors/notFoundError";
import { db } from "../db";
import { surveys } from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function getAllSurveysForUser(userId: string) {
    const results = await db.select().from(surveys).where(eq(surveys.userId, userId));

    return results.map(survey => ({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt
    }));
}

export async function getSurvey(surveyId: string) {
    const results = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Survey not found');
    }

    const survey = results[0];
    return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        createdAt: survey.createdAt
    };
}

export async function createSurvey(title: string, description: string, userId: string) {
    const results = await db.insert(surveys).values({
        title,
        description,
        userId
    }).returning();

    const survey = results[0];
    return {
        id: survey.id,
        title: survey.title,
        description: survey.description
    };
}

export async function editSurvey(surveyId: string, userId: string, title: string, description: string) {
    const results = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Survey not found');
    }

    const survey = results[0];

    if (survey.userId !== userId) {
        throw new NotFoundError('Survey not found');
    }

    const updated = await db.update(surveys)
        .set({ title, description })
        .where(eq(surveys.id, surveyId))
        .returning();

    const updatedSurvey = updated[0];
    return {
        id: updatedSurvey.id,
        title: updatedSurvey.title,
        description: updatedSurvey.description
    };
}

export async function deleteSurvey(surveyId: string, userId: string) {
    const results = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Survey not found');
    }

    const survey = results[0];

    if (survey.userId !== userId) {
        throw new NotFoundError('Survey not found');
    }

    await db.delete(surveys).where(eq(surveys.id, surveyId));
    return true;
}