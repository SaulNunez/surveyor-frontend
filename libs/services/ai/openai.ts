import OpenAI from "openai";
import { InvalidOperationError } from "../../models/Errors/invalidOperationError";
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
export function createOpenAiCompatibleProvider(
    config: AiProviderConfig,
    labels: { name: string; keyEnvVar: string; modelEnvVar: string; unreachable: string }
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
                throw new InvalidOperationError('The model returned an empty summary.');
            }

            return text;
        },
    };
}

export function createOpenAiProvider(config: AiProviderConfig): SummaryProvider {
    return createOpenAiCompatibleProvider(config, {
        name: 'openai',
        keyEnvVar: 'OPENAI_API_KEY',
        modelEnvVar: 'OPENAI_MODEL',
        unreachable: 'Could not reach OpenAI. Try again shortly.',
    });
}

/**
 * Translate a provider failure into something safe to show a survey owner.
 * Provider errors can echo request contents and identify the credential, so
 * the original is logged server-side and never forwarded.
 */
function toInvalidOperationError(
    reason: unknown,
    labels: { name: string; keyEnvVar: string; modelEnvVar: string; unreachable: string }
): InvalidOperationError {
    console.error(`${labels.name} summary request failed:`, reason);

    if (reason instanceof OpenAI.AuthenticationError || reason instanceof OpenAI.PermissionDeniedError) {
        return new InvalidOperationError(
            `The configured ${labels.name} credentials were rejected. Check ${labels.keyEnvVar} on the server.`
        );
    }
    if (reason instanceof OpenAI.RateLimitError) {
        return new InvalidOperationError(`${labels.name} rate limit reached. Try again shortly.`);
    }
    if (reason instanceof OpenAI.NotFoundError) {
        return new InvalidOperationError(
            `The configured model was not found. Check ${labels.modelEnvVar} on the server.`
        );
    }
    if (reason instanceof OpenAI.APIConnectionError) {
        return new InvalidOperationError(labels.unreachable);
    }
    if (reason instanceof OpenAI.APIError) {
        return new InvalidOperationError(`${labels.name} returned an error (status ${reason.status ?? 'unknown'}).`);
    }
    return new InvalidOperationError('Failed to generate a summary.');
}
