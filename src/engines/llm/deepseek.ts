import {
    TranslateEngine,
    TranslateEngineTranslateResult,
    TranslateNamespaceMissingTranslations,
    TranslateOptions,
    TranslationsByLanguage
} from "$/type";
import { flattenObject, unflattenObject } from "$/util";
import { defaultLogger } from "$/logger";
import OpenAI, { APIConnectionTimeoutError, APIError, RateLimitError } from "openai";
import { BreakSilentError } from "$/break-silent-error";
import { createOpenRouterEstimateEngine } from "$/engines/estimate/openrouter";
import { EstimateTokenUsage, EstimateUsage } from "$/engines/estimate/type";
import ISO6391 from "iso-639-1";

export type DeepSeekModel =
    | "v4-flash"
    | "v4-pro"
    | "chat"
    | "reasoner";

type DeepSeekApiModel =
    | "deepseek-v4-flash"
    | "deepseek-v4-pro"
    | "deepseek-chat"
    | "deepseek-reasoner";

const DEFAULT_MODEL: DeepSeekModel = "v4-flash";

const ABSOLUTE_CONTEXT: string[] = [
    "You are a professional translator.",
    "You must output JSON and only JSON.",
    "Keep all object keys and JSON structure exactly the same.",
    "Only translate string values.",
    "Variables enclosed in {} are coded and their names should remain unchanged.",
    "IMPORTANT: Ensure that each translation is in the correct target language. Double-check that you are translating to the specific language requested for each language code."
];

interface DeepSeekChunk {
    baseTranslations: Record<string, any>;
    targetTranslationsShape: Record<string, any>;
}

export interface DeepSeekConfig {
    apiKey: string;

    model?: DeepSeekModel | DeepSeekApiModel | (string & {});

    /**
     * OpenRouter model id used only for pricing estimates.
     * Default: deepseek/{api model}
     */
    estimateModel?: string;

    /**
     * Max: 100
     * Min: 5
     * Default: 50
     */
    chunkSize?: number;

    /**
     * Request timeout in seconds
     * Default: 25
     */
    timeoutSeconds?: number;

    /**
     * Maximum number of retries on timeout or rate limit
     * Default: 10
     */
    maxRetries?: number;

    /**
     * Multiplier for retry-after-ms header on rate limit errors
     * Default: 4
     */
    rateLimitRetryMultiplier?: number;

    /**
     * Extra delay for retry-after-ms header on rate limit errors
     * Default: 1200
     */
    rateLimitRetryExtraDelay?: number;
}

export function createDeepSeekTranslateEngine(config: DeepSeekConfig): TranslateEngine {
    if (!config.apiKey) {
        throw new Error("DeepSeek > Missing apiKey");
    }

    const model = config.model || DEFAULT_MODEL;
    const apiModel = toDeepSeekApiModel(model);
    const estimateEngine = createOpenRouterEstimateEngine({
        provider: "deepseek",
        model: config.estimateModel || apiModel
    });
    const tokenUsage: EstimateTokenUsage = {
        inputTokens: 0,
        outputTokens: 0
    };

    const MAX_CHUNK_SIZE = Math.min(100, Math.max(5, config.chunkSize || 50));
    const TIMEOUT_MS = (config.timeoutSeconds || 25) * 1000;
    const MAX_RETRIES = config.maxRetries || 10;
    const RATE_LIMIT_MULTIPLIER = config.rateLimitRetryMultiplier || 4;
    const RATE_LIMIT_EXTRA_DELAY = config.rateLimitRetryExtraDelay || 1200;

    const deepseek = new OpenAI({
        apiKey: config.apiKey,
        baseURL: "https://api.deepseek.com",
        timeout: TIMEOUT_MS
    });

    let globalTimeoutPromise: Promise<void> | null = null;

    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function computeRateLimitWaitMs(error: unknown): number {
        const apiErr = rateLimitApiErrorFromChain(error);
        const retryAfterMsRaw = headerValue(apiErr?.headers, "retry-after-ms");
        if (retryAfterMsRaw) {
            const n = parseInt(retryAfterMsRaw, 10);
            if (!Number.isNaN(n)) return n * RATE_LIMIT_MULTIPLIER + RATE_LIMIT_EXTRA_DELAY;
        }

        const retryAfterSecRaw = headerValue(apiErr?.headers, "retry-after");
        if (retryAfterSecRaw) {
            const n = parseInt(retryAfterSecRaw, 10);
            if (!Number.isNaN(n)) return n * 1000 * RATE_LIMIT_MULTIPLIER + RATE_LIMIT_EXTRA_DELAY;
        }

        return 1000 + RATE_LIMIT_EXTRA_DELAY;
    }

    function prepareTranslationsAndChunkThem(
        flatBaseTranslations: Record<string, string>,
        languagesTranslations: TranslationsByLanguage
    ): DeepSeekChunk[] {
        const chunks: DeepSeekChunk[] = [];
        let currentChunkSize = 0;
        let currentChunkBaseTranslations: Record<string, string> = {};
        let currentChunkShape: Record<string, any> = {};

        function pushChunk() {
            chunks.push({
                baseTranslations: unflattenObject(currentChunkBaseTranslations),
                targetTranslationsShape: unflattenObject(currentChunkShape)
            });
            currentChunkSize = 0;
            currentChunkBaseTranslations = {};
            currentChunkShape = {};
        }

        for (let languageCode in languagesTranslations) {
            const flat = Object.entries(flattenObject(languagesTranslations[languageCode]));

            do {
                currentChunkSize++; // language code property
                const rest = Math.min(MAX_CHUNK_SIZE - currentChunkSize, flat.length);
                const chunkPart = flat.splice(0, rest);

                for (const [key] of chunkPart) {
                    currentChunkBaseTranslations[key] = flatBaseTranslations[key];
                    currentChunkShape[`${languageCode}.${key}`] = "";
                }

                currentChunkSize += rest;
                if (currentChunkSize == MAX_CHUNK_SIZE) {
                    pushChunk();
                }
            } while (flat.length);

            if (currentChunkSize >= MAX_CHUNK_SIZE - 1) {
                pushChunk();
            }
        }

        if (currentChunkSize) pushChunk();

        return chunks;
    }

    async function withRetry<T>(operation: () => Promise<T>, options: TranslateOptions): Promise<T> {
        const logger = options.logger || defaultLogger;
        let lastError: Error;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (globalTimeoutPromise) {
                    const startTime = Date.now();
                    await globalTimeoutPromise;
                    const waitTime = Date.now() - startTime;
                    if (waitTime > 0) {
                        logger.engineDebug("DeepSeek", `Waited ${waitTime}ms for global timeout synchronization`);
                    }
                }

                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (isDeepSeekInsufficientQuotaError(error)) {
                    throw new BreakSilentError("DeepSeek: insufficient quota / billing — not retrying.", error);
                }

                const isRateLimit = isTransientDeepSeekRateLimit(error);
                const isTimeout = !isRateLimit && error instanceof Error && (
                    error instanceof APIConnectionTimeoutError ||
                    error.message.includes("timeout") ||
                    error.message.includes("ETIMEDOUT") ||
                    error.name === "TimeoutError" ||
                    error.name === "APIConnectionTimeoutError" ||
                    error.constructor.name === "APIConnectionTimeoutError"
                );

                if ((isTimeout || isRateLimit) && attempt < MAX_RETRIES) {
                    if (isRateLimit) {
                        const waitTime = computeRateLimitWaitMs(error);
                        logger.engineDebug("DeepSeek", `Rate limit hit on attempt ${attempt}/${MAX_RETRIES}, waiting ${waitTime}ms before retry...`);

                        const sleepPromise = sleep(waitTime);
                        globalTimeoutPromise = sleepPromise;
                        await sleepPromise;
                        globalTimeoutPromise = null;
                    } else {
                        const timeoutWaitTime = 2000;
                        logger.engineDebug("DeepSeek", `Timeout on attempt ${attempt}/${MAX_RETRIES}, waiting ${timeoutWaitTime}ms before retry...`);

                        const sleepPromise = sleep(timeoutWaitTime);
                        globalTimeoutPromise = sleepPromise;
                        await sleepPromise;
                        globalTimeoutPromise = null;
                    }
                    continue;
                }

                throw error;
            }
        }

        throw lastError!;
    }

    async function fetchTranslations(chunks: DeepSeekChunk[], options: TranslateOptions) {
        const logger = options.logger || defaultLogger;
        const systemContext = [
            ...ABSOLUTE_CONTEXT,
            toLanguagesContext(options.baseLanguageCode, options.targetLanguageCodes),
            ...options.applicationContextEntries
        ].join(" ");

        async function fetchChunk(chunk: DeepSeekChunk) {
            return await withRetry(async () => {
                const response = await deepseek.chat.completions.create({
                    model: apiModel,
                    response_format: { type: "json_object" },
                    messages: [
                        { role: "system", content: systemContext },
                        {
                            role: "user",
                            content: JSON.stringify({
                                task: "Translate baseTranslations into targetTranslationsShape. Return only the completed targetTranslationsShape object.",
                                baseTranslations: chunk.baseTranslations,
                                targetTranslationsShape: chunk.targetTranslationsShape
                            })
                        }
                    ]
                });

                tokenUsage.inputTokens += response.usage?.prompt_tokens || 0;
                tokenUsage.outputTokens += response.usage?.completion_tokens || 0;

                const content = response.choices[0]?.message?.content;
                if (!content) {
                    throw new Error("Received empty response from DeepSeek API.");
                }

                return parseJsonObject(content);
            }, options);
        }

        const mergedFlat: any = {};
        let fetchedCount = 0;

        const translatedChunks = await Promise.all(
            chunks.map(async (chunk: DeepSeekChunk, i: number) => {
                if (chunks.length > 1) {
                    logger.engineDebug("DeepSeek", `Fetching chunk ${i + 1}/${chunks.length}`);
                }
                const result = await fetchChunk(chunk);

                fetchedCount++;

                logger.engineDebug("DeepSeek", `Fetched chunk ${i + 1} (${fetchedCount}/${chunks.length})`);
                return result;
            })
        );

        logger.engineDebug("DeepSeek", "Finished fetching all chunks");

        for (const translatedChunk of translatedChunks) {
            const flatChunk = flattenObject(translatedChunk);
            for (const path in flatChunk) {
                mergedFlat[path] = flatChunk[path];
            }
        }

        return unflattenObject(mergedFlat);
    }

    return {
        name: `DeepSeek (${model})`,

        type: "llm",

        canBeTrustedWithVariablesTranslation: true,

        async initializeEstimate() {
            tokenUsage.inputTokens = 0;
            tokenUsage.outputTokens = 0;
            return await estimateEngine.initialize();
        },

        estimatePrice(usage: EstimateUsage) {
            return estimateEngine.estimatePrice(usage);
        },

        getUsage() {
            return {...tokenUsage};
        },

        async translate(
            translations: Record<string, any>,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {
            const languagesTranslations: any = {};
            for (let targetLanguageCode of options.targetLanguageCodes) {
                languagesTranslations[targetLanguageCode] = translations;
            }

            const chunks = prepareTranslationsAndChunkThem(
                flattenObject(translations),
                languagesTranslations
            );

            return await fetchTranslations(chunks, options);
        },

        async translateMissed(
            missingTranslations: TranslateNamespaceMissingTranslations,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {
            const chunks = prepareTranslationsAndChunkThem(
                flattenObject(missingTranslations.baseLanguageTranslations),
                missingTranslations.targetLanguageTranslationsKeys
            );

            return await fetchTranslations(chunks, options);
        }
    };
}

function isDeepSeekInsufficientQuotaError(error: unknown): boolean {
    const api = rateLimitApiErrorFromChain(error);
    const nested = api?.error as { code?: string; message?: string } | undefined;
    const code = api?.code ?? nested?.code;
    if (code === "insufficient_quota") return true;
    const msg = error instanceof Error ? error.message : nested?.message || "";
    if (/insufficient.*balance|insufficient.*quota|billing|top.?up/i.test(msg)) return true;
    return false;
}

function isTransientDeepSeekRateLimit(error: unknown): boolean {
    if (isDeepSeekInsufficientQuotaError(error)) return false;
    const api = rateLimitApiErrorFromChain(error);
    if (api && api.status === 429) return true;
    if (error instanceof Error && /^429(\s|$)/.test(error.message)) return true;
    return false;
}

function rateLimitApiErrorFromChain(error: unknown): APIError | null {
    let e: unknown = error;
    const seen = new Set<unknown>();
    while (e instanceof Error && !seen.has(e)) {
        seen.add(e);
        if (e instanceof RateLimitError) return e;
        if (e instanceof APIError && e.status === 429) return e;
        if (e instanceof APIError && (e.code === "insufficient_quota" || e.code === "rate_limit_exceeded")) {
            return e;
        }
        e = (e as Error & { cause?: unknown }).cause;
    }
    return null;
}

function headerValue(headers: unknown, name: string): string | undefined {
    if (headers == null) return undefined;
    const h = headers as { get?: (n: string) => string | null };
    if (typeof h.get === "function") {
        return h.get(name) ?? undefined;
    }
    const found = Object.keys(headers as object).find(k => k.toLowerCase() === name.toLowerCase());
    return found ? String((headers as Record<string, string>)[found]) : undefined;
}

function parseJsonObject(content: string): Record<string, any> {
    try {
        return JSON.parse(content);
    } catch {
        const firstIndex = content.indexOf("{");
        const lastIndex = content.lastIndexOf("}");
        if (firstIndex === -1 || lastIndex === -1 || firstIndex > lastIndex) {
            throw new Error("DeepSeek response is not valid JSON.");
        }

        return JSON.parse(content.substring(firstIndex, lastIndex + 1));
    }
}

function toDeepSeekApiModel(model: string): DeepSeekApiModel | (string & {}) {
    if (model.startsWith("deepseek-")) return model as DeepSeekApiModel | (string & {});
    return `deepseek-${model}`;
}

function toLanguagesContext(baseLanguageCode: string, languages: string[]) {
    const getLanguageName = (code: string) => {
        let name = ISO6391.getName(code);

        if (!name && code.includes("-")) {
            const languagePart = code.split("-")[0];
            name = ISO6391.getName(languagePart);

            if (name) {
                const regionPart = code.split("-")[1].toUpperCase();
                return `${name} (${regionPart})`;
            }
        }

        return name || code;
    };

    const baseLanguageName = getLanguageName(baseLanguageCode);
    const targetLanguagesWithNames = languages.map(code => `${code} (${getLanguageName(code)})`);

    return `You are translating from language with code "${baseLanguageCode}" (${baseLanguageName}) to the following language codes: "${targetLanguagesWithNames.join(", ")}".`;
}
