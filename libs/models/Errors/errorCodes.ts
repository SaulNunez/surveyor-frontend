/**
 * Every error a service can raise that a reader is meant to see.
 *
 * Services name an outcome with one of these codes; the route layer turns the
 * code into a sentence in the caller's language (`libs/i18n/apiErrors.ts`).
 * Services deliberately hold no Lingui macros: they are the layer the vitest
 * suite exercises directly, and the macro transform only runs inside the Next
 * build, so a `msg` here would throw the moment a test imported it.
 *
 * The English text below is what `Error.message` carries — for server logs,
 * for stack traces, and for the tests that assert on it. It is *not* what the
 * reader sees; that comes from the descriptor map, which the compiler keeps
 * exhaustive against this list.
 */
export const ERROR_MESSAGES = {
    surveyNotFound: 'Survey not found',
    questionNotFound: 'Question not found',
    attemptNotFound: 'Attempt not found',
    responseNotFound: 'Response not found',

    surveyRequiresAccount: 'This survey requires an account to answer',
    emailAlreadyRegistered: 'That email is already registered',
    accountAlreadyHasCredentials: 'This account already has credentials',

    couldNotStartAttempt: 'Could not start an attempt for this survey',
    cannotDeleteCompletedAttempt: 'Cannot delete a completed attempt',

    onlyOpenEndedCanBeSummarized: 'Only open-ended questions can be summarized',
    noResponsesToSummarize: 'There are no responses to summarize yet',

    // Deployment problems. They still reach a survey owner, because the owner
    // is the one who clicked Summarize and is owed an explanation — but they
    // name env vars, so they are written for whoever runs the server.
    noAiProviderConfigured: 'No AI provider is configured on this server. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_BASE_URL.',
    unknownAiProviderRequested: 'Unknown AI_SUMMARY_PROVIDER "{provider}". Expected one of: anthropic, openai, ollama.',
    aiProviderCredentialsMissing: 'AI_SUMMARY_PROVIDER is set to "{provider}" but {envVar} is not configured.',
    aiCredentialsRejected: 'The configured {provider} credentials were rejected. Check {envVar} on the server.',
    aiModelNotFound: 'The configured model was not found. Check {envVar} on the server.',

    aiRateLimited: '{provider} rate limit reached. Try again shortly.',
    aiUnreachable: 'Could not reach {provider}. Try again shortly.',
    ollamaUnreachable: 'Could not reach the Ollama server. Check that it is running and that OLLAMA_BASE_URL is correct.',
    aiProviderError: '{provider} returned an error (status {status}).',
    aiModelDeclined: 'The model declined to summarize these responses.',
    aiEmptySummary: 'The model returned an empty summary.',
    summaryGenerationFailed: 'Failed to generate a summary.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

/** Values substituted into a code's `{placeholder}`s. */
export type ErrorValues = Record<string, string | number>;

/**
 * Fills a code's English template for `Error.message`. The same values are kept
 * on the error so the translated message can be filled the same way.
 */
export function formatErrorMessage(code: ErrorCode, values?: ErrorValues): string {
    const template: string = ERROR_MESSAGES[code];
    if (!values) return template;

    return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
        key in values ? String(values[key]) : placeholder,
    );
}
