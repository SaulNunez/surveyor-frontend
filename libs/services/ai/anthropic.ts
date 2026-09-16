import Anthropic from "@anthropic-ai/sdk";
import { InvalidOperationError } from "../../models/Errors/invalidOperationError";
import { AiProviderConfig } from "./config";
import { SUMMARY_SYSTEM_PROMPT, buildSummaryUserMessage } from "./prompt";
import { SummaryProvider } from "./types";

const MAX_TOKENS = 2048;

export function createAnthropicProvider(config: AiProviderConfig): SummaryProvider {
    const client = new Anthropic({ apiKey: config.apiKey });

    return {
        name: 'anthropic',
        model: config.model,
        async summarize(questionText, responses, totalResponseCount) {
            let response;
            try {
                response = await client.messages.create({
                    model: config.model,
                    max_tokens: MAX_TOKENS,
                    // A short summarisation needs little deliberation, and the
                    // owner is waiting on the request.
                    output_config: { effort: 'low' },
                    system: SUMMARY_SYSTEM_PROMPT,
                    messages: [{
                        role: 'user',
                        content: buildSummaryUserMessage({ questionText, responses, totalResponseCount }),
                    }],
                });
            } catch (reason) {
                throw toInvalidOperationError(reason);
            }

            if (response.stop_reason === 'refusal') {
                throw new InvalidOperationError(
                    'The model declined to summarize these responses.'
                );
            }

            const text = response.content
                .filter((block): block is Anthropic.TextBlock => block.type === 'text')
                .map(block => block.text)
                .join('\n')
                .trim();

            if (text.length === 0) {
                throw new InvalidOperationError('The model returned an empty summary.');
            }

            return text;
        },
    };
}

/**
 * Translate a provider failure into something safe to show a survey owner.
 * Provider errors can echo request contents and identify the credential, so
 * the original is logged server-side and never forwarded.
 */
function toInvalidOperationError(reason: unknown): InvalidOperationError {
    console.error('Anthropic summary request failed:', reason);

    if (reason instanceof Anthropic.AuthenticationError) {
        return new InvalidOperationError(
            'The configured Anthropic API key was rejected. Check ANTHROPIC_API_KEY on the server.'
        );
    }
    if (reason instanceof Anthropic.RateLimitError) {
        return new InvalidOperationError('Anthropic rate limit reached. Try again shortly.');
    }
    if (reason instanceof Anthropic.NotFoundError) {
        return new InvalidOperationError(
            'The configured Anthropic model was not found. Check ANTHROPIC_MODEL on the server.'
        );
    }
    if (reason instanceof Anthropic.APIConnectionError) {
        return new InvalidOperationError('Could not reach Anthropic. Try again shortly.');
    }
    if (reason instanceof Anthropic.APIError) {
        return new InvalidOperationError(`Anthropic returned an error (status ${reason.status ?? 'unknown'}).`);
    }
    return new InvalidOperationError('Failed to generate a summary.');
}
