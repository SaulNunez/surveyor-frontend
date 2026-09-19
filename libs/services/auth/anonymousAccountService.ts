import { db } from "../../db";
import { Executor } from "../../db/executor";
import { InvalidOperationError } from "../../models/Errors/invalidOperationError";
import { isSurveyOpenToAnyone } from "../surveyService";
import { createAnonymousUser, PublicUser } from "./userService";

/**
 * Mints a guest account for someone about to answer a survey.
 *
 * The survey is checked first, and only a survey that actually accepts
 * anonymous answers will mint one — otherwise the sign-in endpoint behind this
 * would be a free account-minting faucet for anyone who can reach `/api/auth`.
 * The check has to come before the insert, not after, or a rejected request
 * would still leave a row behind.
 *
 * Kept in its own module so the user/auth service does not take a dependency
 * on surveys.
 */
export async function createAnonymousUserForSurvey(
    surveyPublicId: string,
    executor: Executor = db
): Promise<PublicUser> {
    // Throws NotFoundError when there is no such survey, which the caller
    // reports the same way every other missing survey is reported.
    const openToAnyone = await isSurveyOpenToAnyone(surveyPublicId, executor);

    if (!openToAnyone) {
        throw new InvalidOperationError('This survey requires an account to answer');
    }

    return await createAnonymousUser(executor);
}
