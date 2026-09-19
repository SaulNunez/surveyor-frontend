import { InvalidOperationError } from "../../models/Errors/invalidOperationError";

export type AiProviderName = 'anthropic' | 'openai' | 'ollama';

export interface AiProviderConfig {
    provider: AiProviderName;
    model: string;
    apiKey: string;
    /** Only set for providers that talk to a non-default endpoint. */
    baseUrl?: string;
}

const DEFAULT_MODELS: Record<AiProviderName, string> = {
    anthropic: 'claude-opus-5',
    openai: 'gpt-4o-mini',
    ollama: 'llama3.1',
};

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';

/** Env vars arrive as empty strings as often as they arrive unset. */
function read(name: string): string | undefined {
    const value = process.env[name];
    if (value === undefined) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function anthropicConfig(): AiProviderConfig | null {
    const apiKey = read('ANTHROPIC_API_KEY');
    if (!apiKey) {
        return null;
    }
    return {
        provider: 'anthropic',
        model: read('ANTHROPIC_MODEL') ?? DEFAULT_MODELS.anthropic,
        apiKey,
    };
}

function openaiConfig(): AiProviderConfig | null {
    const apiKey = read('OPENAI_API_KEY');
    if (!apiKey) {
        return null;
    }
    return {
        provider: 'openai',
        model: read('OPENAI_MODEL') ?? DEFAULT_MODELS.openai,
        apiKey,
        baseUrl: read('OPENAI_BASE_URL'),
    };
}

function ollamaConfig(): AiProviderConfig | null {
    // Ollama is a local server with no credential of its own: a reachable base
    // URL is the whole configuration. Treat the default URL as "configured"
    // only when the operator names ollama explicitly, so auto-detection never
    // silently points at a localhost port that may hold something else.
    const baseUrl = read('OLLAMA_BASE_URL');
    if (!baseUrl) {
        return null;
    }
    return {
        provider: 'ollama',
        model: read('OLLAMA_MODEL') ?? DEFAULT_MODELS.ollama,
        // The OpenAI-compatible endpoint requires a key it never checks.
        apiKey: 'ollama',
        baseUrl,
    };
}

const RESOLVERS: Record<AiProviderName, () => AiProviderConfig | null> = {
    anthropic: anthropicConfig,
    openai: openaiConfig,
    ollama: ollamaConfig,
};

/** Auto-detection order when AI_SUMMARY_PROVIDER is unset. */
const AUTO_DETECT_ORDER: AiProviderName[] = ['anthropic', 'openai', 'ollama'];

function isProviderName(value: string): value is AiProviderName {
    return value === 'anthropic' || value === 'openai' || value === 'ollama';
}

/**
 * Resolve the configured provider from the environment, or null when the
 * deployment has none. Read at call time rather than at module load, so a
 * production build never requires provider credentials to be present.
 *
 * An explicit AI_SUMMARY_PROVIDER always wins: when it names a provider whose
 * credentials are missing this throws rather than quietly falling through to a
 * different one, because silently billing the wrong account is worse than a
 * clear error.
 */
export function resolveAiProviderConfig(): AiProviderConfig | null {
    const requested = read('AI_SUMMARY_PROVIDER')?.toLowerCase();

    if (requested) {
        if (!isProviderName(requested)) {
            throw new InvalidOperationError(
                `Unknown AI_SUMMARY_PROVIDER "${requested}". Expected one of: anthropic, openai, ollama.`
            );
        }

        const config = RESOLVERS[requested]();
        if (!config) {
            const missing = requested === 'ollama' ? 'OLLAMA_BASE_URL' : `${requested.toUpperCase()}_API_KEY`;
            throw new InvalidOperationError(
                `AI_SUMMARY_PROVIDER is set to "${requested}" but ${missing} is not configured.`
            );
        }
        return config;
    }

    for (const name of AUTO_DETECT_ORDER) {
        const config = RESOLVERS[name]();
        if (config) {
            return config;
        }
    }

    return null;
}

export { DEFAULT_MODELS, DEFAULT_OLLAMA_BASE_URL };
