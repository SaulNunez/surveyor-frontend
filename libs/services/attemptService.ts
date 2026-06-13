import { db } from "../db";
import { attempts } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { InvalidOperationError } from "../models/Errors/invalidOperationError";
import { NotFoundError } from "../models/Errors/notFoundError";

async function getLatestAttempt(surveyId: string, userId: string) {
    const results = await db.select()
        .from(attempts)
        .where(and(eq(attempts.surveyId, surveyId), eq(attempts.userId, userId)))
        .orderBy(desc(attempts.startedAt))
        .limit(1);

    if (results.length === 0) throw new NotFoundError('No attempt found');

    return results[0];
}

export async function getExistingAttempt(surveyId: string, userId: string) {
    let existingAttempt = await getLatestAttempt(surveyId, userId);

    if (existingAttempt.completedAt) {
        return null;
    }

    return {
        id: existingAttempt.id,
        survey: existingAttempt.surveyId,
        startedAt: existingAttempt.startedAt
    };
}

export async function createNewAttempt(surveyId: string, userId: string) {
    let existingAttempt = await getLatestAttempt(surveyId, userId);

    if (existingAttempt && !existingAttempt.completedAt) {
        return {
            id: existingAttempt.id,
            survey: existingAttempt.surveyId,
            startedAt: existingAttempt.startedAt
        };
    }

    const results = await db.insert(attempts).values({
        surveyId: surveyId,
        userId: userId,
        startedAt: new Date()
    }).returning();

    const newAttempt = results[0];

    return {
        id: newAttempt.id,
        survey: newAttempt.surveyId,
        startedAt: newAttempt.startedAt
    };
}

export async function deleteExistingAttempt(attemptId: string, userId: string) {
    const results = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Attempt not found');
    }

    const existingAttempt = results[0];

    if (existingAttempt.completedAt) {
        throw new InvalidOperationError('Attempt not found');
    }

    if (existingAttempt.userId !== userId) {
        throw new NotFoundError('Attempt not found');
    }

    await db.delete(attempts).where(eq(attempts.id, attemptId));
    return true;
}

export async function completeExistingAttempt(attemptId: string, userId: string) {
    const results = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Attempt not found');
    }

    const existingAttempt = results[0];

    if (existingAttempt.completedAt) {
        return null;
    }

    if (existingAttempt.userId !== userId) {
        throw new NotFoundError('Attempt not found');
    }

    const updated = await db.update(attempts)
        .set({ completedAt: new Date() })
        .where(eq(attempts.id, attemptId))
        .returning();

    const completedAttempt = updated[0];

    return {
        id: completedAttempt.id,
        survey: completedAttempt.surveyId,
        startedAt: completedAttempt.startedAt,
        completedAt: completedAttempt.completedAt
    };
}