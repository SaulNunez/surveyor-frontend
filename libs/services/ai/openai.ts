import OpenAI from "openai";
import { InvalidOperationError } from "../../models/Errors/invalidOperationError";
import type { ErrorCode } from "../../models/Errors/errorCodes";
import { AiProviderConfig } from "./config";
import { SUMMARY_SYSTEM_PROMPT, buildSummaryUserMessage } from "./prompt";
import { SummaryProvider } from "./types";

const MAX_TOKENS = 2048;

/**
 * Provider over an OpenAI-compatible `/v1/chat/completions` endpoint. Serves
 * both OpenAI itself and Ollama, which exposes the same surface — the only
 * differences are the base URL, whether the key means anything, and what an
 * unreachable endpoint implies for the operator.
 */
/**
 * `name` identifies the provider to the client; `displayName` is what the
 * reader sees in an error. `unreachable` is a code rather than a shared message
 * because a local Ollama that is simply not running needs different advice from
 * a hosted endpoint that timed out.
 */
type ProviderLabels = {
    name: string;
    displayName: string;
    keyEnvVar: string;
    modelEnvVar: string;
    unreachable: ErrorCode;
};

export function createOpenAiCompatibleProvider(
    config: AiProviderConfig,
    labels: ProviderLabels
): SummaryProvider {
    const client = new OpenAI({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    });

    return {
        name: labels.name,
        model: config.model,
        async summarize(questionText, responses, totalResponseCount) {
            let completion;
            try {
                completion = await client.chat.completions.create({
                    model: config.model,
                    max_completion_tokens: MAX_TOKENS,
                    messages: [
                        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
                        {
                            role: 'user',
                            content: buildSummaryUserMessage({ questionText, responses, totalResponseCount }),
                        },
                    ],
                });
            } catch (reason) {
                throw toInvalidOperationError(reason, labels);
            }

            const text = completion.choices[0]?.message?.content?.trim() ?? '';
            if (text.length === 0) {
                throw new InvalidOperationError('aiEmptySummary');
            }

            return text;
        },
    };
}

export function createOpenAiProvider(config: AiProviderConfig): SummaryProvider {
    return createOpenAiCompatibleProvider(config, {
        name: 'openai',
        displayName: 'OpenAI',
        keyEnvVar: 'OPENAI_API_KEY',
        modelEnvVar: 'OPENAI_MODEL',
        unreachable: 'aiUnreachable',
    });
}

/**
 * Translate a provider failure into something safe to show a survey owner.
 * Provider errors can echo request contents and identify the credential, so
 * the original is logged server-side and never forwarded.
 */
function toInvalidOperationError(
    reason: unknown,
    labels: ProviderLabels
): InvalidOperationError {
    console.error(`${labels.name} summary request failed:`, reason);

    if (reason instanceof OpenAI.AuthenticationError || reason instanceof OpenAI.PermissionDeniedError) {
        return new InvalidOperationError('aiCredentialsRejected', {
            provider: labels.displayName,
            envVar: labels.keyEnvVar,
        });
    }
    if (reason instanceof OpenAI.RateLimitError) {
        return new InvalidOperationError('aiRateLimited', { provider: labels.displayName });
    }
    if (reason instanceof OpenAI.NotFoundError) {
        return new InvalidOperationError('aiModelNotFound', { envVar: labels.modelEnvVar });
    }
    if (reason instanceof OpenAI.APIConnectionError) {
        return new InvalidOperationError(labels.unreachable, { provider: labels.displayName });
    }
    if (reason instanceof OpenAI.APIError) {
        return new InvalidOperationError('aiProviderError', {
            provider: labels.displayName,
            status: reason.status ?? 'unknown',
        });
    }
    return new InvalidOperationError('summaryGenerationFailed');
}
