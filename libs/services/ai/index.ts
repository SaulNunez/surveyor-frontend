import { AiProviderConfig, resolveAiProviderConfig } from "./config";
import { createAnthropicProvider } from "./anthropic";
import { createOllamaProvider } from "./ollama";
import { createOpenAiProvider } from "./openai";
import { SummaryProvider } from "./types";

export type { SummaryProvider } from "./types";
export type { AiProviderConfig, AiProviderName } from "./config";
export { resolveAiProviderConfig } from "./config";

export function createSummaryProvider(config: AiProviderConfig): SummaryProvider {
    switch (config.provider) {
        case 'anthropic':
            return createAnthropicProvider(config);
        case 'openai':
            return createOpenAiProvider(config);
        case 'ollama':
            return createOllamaProvider(config);
    }
}

/**
 * The provider this deployment is configured to use, or null when none is.
 * Throws InvalidOperationError when AI_SUMMARY_PROVIDER names a provider whose
 * credentials are missing.
 */
export function resolveSummaryProvider(): SummaryProvider | null {
    const config = resolveAiProviderConfig();
    return config ? createSummaryProvider(config) : null;
}
