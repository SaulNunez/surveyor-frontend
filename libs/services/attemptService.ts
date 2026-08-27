import { db } from "../db";
import { Executor } from "../db/executor";
import { attempts } from "../db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
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

/**
 * The user's in-progress attempt at a survey, or null when they have never
 * started one or have already completed their latest one.
 *
 * `attempts_one_in_progress_per_user_survey` guarantees there is at most one
 * such row, so this does not have to guess which of several is current.
 */
export async function getExistingAttempt(surveyId: string, userId: string, executor: Executor = db) {
    const results = await executor.select()
        .from(attempts)
        .where(and(
            eq(attempts.surveyId, surveyId),
            eq(attempts.userId, userId),
            isNull(attempts.completedAt)
        ))
        .limit(1);

    const attempt = results[0];
    return attempt ? toAttempt(attempt) : null;
}

/**
 * Get-or-create: resumes the in-progress attempt when there is one, otherwise
 * starts a fresh attempt. Starting over is `restartAttempt`.
 *
 * Insert-first rather than check-then-insert: two concurrent saves would both
 * pass a check, so the partial unique index arbitrates instead and the loser
 * reads back the winner's row.
 */
export async function createNewAttempt(surveyId: string, userId: string, executor: Executor = db) {
    const inserted = await executor.insert(attempts)
        .values({ surveyId, userId, startedAt: new Date() })
        .onConflictDoNothing({
            target: [attempts.surveyId, attempts.userId],
            // Repeats the partial index's predicate; without it Postgres cannot
            // infer which index arbitrates the conflict.
            where: sql`${attempts.completedAt} is null`
        })
        .returning();

    if (inserted.length > 0) {
        return toAttempt(inserted[0]);
    }

    // Lost the race: the concurrent save's attempt is the in-progress one.
    const existingAttempt = await getExistingAttempt(surveyId, userId, executor);
    if (!existingAttempt) {
        throw new InvalidOperationError('Could not start an attempt for this survey');
    }
    return existingAttempt;
}

/**
 * Discards the in-progress attempt and starts a fresh one in a single
 * transaction, so a restart cannot leave the user with no attempt at all.
 */
export async function restartAttempt(surveyId: string, userId: string) {
    return await db.transaction(async (tx) => {
        const existingAttempt = await getExistingAttempt(surveyId, userId, tx);

        if (existingAttempt) {
            await tx.delete(attempts).where(eq(attempts.id, existingAttempt.id));
        }

        return await createNewAttempt(surveyId, userId, tx);
    });
}

export async function deleteExistingAttempt(attemptId: string, userId: string, executor: Executor = db) {
    const results = await executor.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);

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

    await executor.delete(attempts).where(eq(attempts.id, attemptId));
    return true;
}

export async function completeExistingAttempt(attemptId: string, userId: string, executor: Executor = db) {
    const results = await executor.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);

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

    const updated = await executor.update(attempts)
        .set({ completedAt: new Date() })
        .where(eq(attempts.id, attemptId))
        .returning();

    const completedAttempt = updated[0];

    return {
        ...toAttempt(completedAttempt),
        completedAt: completedAttempt.completedAt
    };
}
