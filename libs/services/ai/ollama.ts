import { AiProviderConfig, DEFAULT_OLLAMA_BASE_URL } from "./config";
import { createOpenAiCompatibleProvider } from "./openai";
import { SummaryProvider } from "./types";

/**
 * Ollama serves an OpenAI-compatible `/v1/chat/completions`, so it reuses that
 * client wholesale. The API key it requires is never checked by the local
 * server.
 */
export function createOllamaProvider(config: AiProviderConfig): SummaryProvider {
    return createOpenAiCompatibleProvider(
        { ...config, baseUrl: config.baseUrl ?? DEFAULT_OLLAMA_BASE_URL },
        {
            name: 'ollama',
            keyEnvVar: 'OLLAMA_BASE_URL',
            modelEnvVar: 'OLLAMA_MODEL',
            unreachable: 'Could not reach the Ollama server. Check that it is running and that OLLAMA_BASE_URL is correct.',
        }
    );
}
