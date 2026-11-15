import "server-only";

import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";
import type { ErrorCode } from "@/libs/models/Errors/errorCodes";
import { InvalidOperationError } from "@/libs/models/Errors/invalidOperationError";
import { NotFoundError } from "@/libs/models/Errors/notFoundError";
import { getRequestI18n } from "./server";

/**
 * What the reader is told for each {@link ErrorCode}.
 *
 * The English here repeats `ERROR_MESSAGES`, and deliberately so: that one is
 * the log line, this one is the sentence, and only this one is extracted into
 * the catalogs. They live apart because a service may not hold a Lingui macro
 * (see the note in `errorCodes.ts`). `Record<ErrorCode, …>` is what keeps them
 * in step — a new code will not compile until it has a message here.
 */
const ERROR_DESCRIPTORS: Record<ErrorCode, MessageDescriptor> = {
    surveyNotFound: msg`Survey not found`,
    questionNotFound: msg`Question not found`,
    attemptNotFound: msg`Attempt not found`,
    responseNotFound: msg`Response not found`,

    surveyRequiresAccount: msg`This survey requires an account to answer`,
    emailAlreadyRegistered: msg`That email is already registered`,
    accountAlreadyHasCredentials: msg`This account already has credentials`,

    couldNotStartAttempt: msg`Could not start an attempt for this survey`,
    cannotDeleteCompletedAttempt: msg`Cannot delete a completed attempt`,

    onlyOpenEndedCanBeSummarized: msg`Only open-ended questions can be summarized`,
    noResponsesToSummarize: msg`There are no responses to summarize yet`,

    noAiProviderConfigured: msg`No AI provider is configured on this server. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_BASE_URL.`,
    // The `{...}` below are ICU placeholders written out by hand, filled from
    // the error's `values`. They are not template substitutions — the text has
    // to reach the catalog with the holes still in it.
    unknownAiProviderRequested: msg`Unknown AI_SUMMARY_PROVIDER "{provider}". Expected one of: anthropic, openai, ollama.`,
    aiProviderCredentialsMissing: msg`AI_SUMMARY_PROVIDER is set to "{provider}" but {envVar} is not configured.`,
    aiCredentialsRejected: msg`The configured {provider} credentials were rejected. Check {envVar} on the server.`,
    aiModelNotFound: msg`The configured model was not found. Check {envVar} on the server.`,

    aiRateLimited: msg`{provider} rate limit reached. Try again shortly.`,
    aiUnreachable: msg`Could not reach {provider}. Try again shortly.`,
    ollamaUnreachable: msg`Could not reach the Ollama server. Check that it is running and that OLLAMA_BASE_URL is correct.`,
    aiProviderError: msg`{provider} returned an error (status {status}).`,
    aiModelDeclined: msg`The model declined to summarize these responses.`,
    aiEmptySummary: msg`The model returned an empty summary.`,
    summaryGenerationFailed: msg`Failed to generate a summary.`,
};

/**
 * What an error with no code becomes. Anything that reaches here is a fault in
 * the server, not something the reader did, and its real text is English prose
 * from a driver or a bug — so it is logged rather than forwarded, and the
 * reader gets a sentence that is both translatable and safe to show.
 */
const UNEXPECTED = msg`Something went wrong. Please try again.`;

/** A message in the caller's language, for a route that is not reporting a thrown error. */
export async function translate(descriptor: MessageDescriptor): Promise<string> {
    const i18n = await getRequestI18n();
    return i18n._(descriptor);
}

/**
 * The sentence to send back for something a service threw, in the caller's
 * language. Errors carrying a code are reported as themselves; anything else is
 * logged here and reported as {@link UNEXPECTED}.
 */
export async function errorMessage(reason: unknown): Promise<string> {
    const i18n = await getRequestI18n();

    if (reason instanceof NotFoundError || reason instanceof InvalidOperationError) {
        // Lingui takes a descriptor's placeholder values on the descriptor
        // itself, so the error's values are folded in rather than passed along.
        // Built as a variable, not inline: the message extractor tries to read
        // an object literal passed to `i18n._` as a descriptor to extract, and
        // chokes on the spread.
        const descriptor: MessageDescriptor = {
            ...ERROR_DESCRIPTORS[reason.code],
            values: reason.values,
        };
        return i18n._(descriptor);
    }

    console.error("Unhandled error in API route:", reason);
    return i18n._(UNEXPECTED);
}
