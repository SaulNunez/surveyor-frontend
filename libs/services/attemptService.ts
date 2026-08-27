import { db } from "../db";
import { attempts } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { InvalidOperationError } from "../models/Errors/invalidOperationError";
import { NotFoundError } from "../models/Errors/notFoundError";

type AttemptRow = typeof attempts.$inferSelect;

function toAttempt(attempt: AttemptRow) {
    return {
        id: attempt.id,
        survey: attempt.surveyId,
        startedAt: attempt.startedAt
    };
}

async function getLatestAttempt(surveyId: string, userId: string): Promise<AttemptRow | null> {
    const results = await db.select()
        .from(attempts)
        .where(and(eq(attempts.surveyId, surveyId), eq(attempts.userId, userId)))
        .orderBy(desc(attempts.startedAt))
        .limit(1);

    return results[0] ?? null;
}

/**
 * The user's in-progress attempt at a survey, or null when they have never
 * started one or have already completed their latest one.
 */
export async function getExistingAttempt(surveyId: string, userId: string) {
    const latestAttempt = await getLatestAttempt(surveyId, userId);

    if (!latestAttempt || latestAttempt.completedAt) {
        return null;
    }

    return toAttempt(latestAttempt);
}

/**
 * Get-or-create: resumes the in-progress attempt when there is one, otherwise
 * starts a fresh attempt. Starting over is done by deleting the in-progress
 * attempt first (see `deleteExistingAttempt`) and calling this again.
 */
export async function createNewAttempt(surveyId: string, userId: string) {
    const existingAttempt = await getExistingAttempt(surveyId, userId);

    if (existingAttempt) {
        return existingAttempt;
    }

    const results = await db.insert(attempts).values({
        surveyId: surveyId,
        userId: userId,
        startedAt: new Date()
    }).returning();

    return toAttempt(results[0]);
}

export async function deleteExistingAttempt(attemptId: string, userId: string) {
    const results = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);

    if (results.length === 0) {
        throw new NotFoundError('Attempt not found');
    }

    const existingAttempt = results[0];

    if (existingAttempt.completedAt) {
        throw new InvalidOperationError('Cannot delete a completed attempt');
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
        ...toAttempt(completedAttempt),
        completedAt: completedAttempt.completedAt
    };
}
