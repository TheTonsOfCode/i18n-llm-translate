import {
    TranslateEngine,
    TranslateEngineTranslateResult,
    TranslateNamespaceMissingTranslations,
    TranslateOptions, TranslationsByLanguage
} from "$/type";
import { flattenObject, unflattenObject } from "$/util";
import { defaultLogger } from "$/logger";
import { OpenAI } from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import ISO6391 from 'iso-639-1';

function toLanguagesContext(baseLanguageCode: string, languages: string[]) {
    const getLanguageName = (code: string) => {
        // Try full code first
        let name = ISO6391.getName(code);

        // If not found and code contains region (e.g., en-gb), try just the language part
        if (!name && code.includes('-')) {
            const languagePart = code.split('-')[0];
            name = ISO6391.getName(languagePart);

            // If found, add region info
            if (name) {
                const regionPart = code.split('-')[1].toUpperCase();
                return `${name} (${regionPart})`;
            }
        }

        return name || code; // Fallback to code if name not found
    };

    const baseLanguageName = getLanguageName(baseLanguageCode);
    const targetLanguagesWithNames = languages.map(code => `${code} (${getLanguageName(code)})`);

    return `You are translating from language with code "${baseLanguageCode}" (${baseLanguageName}) to the following language codes: "${targetLanguagesWithNames.join(', ')}".`;
}

const ABSOLUTE_CONTEXT: string[] = [
    'You are a professional translator.',

    'When translating a value, consider the key name to better understand the context.',
    'Variables enclosed in {} are coded and their names should remain unchanged.',
    'IMPORTANT: Ensure that each translation is in the correct target language. Double-check that you are translating to the specific language requested for each language code.',
];

interface OpenAIChunk {
    baseTranslations: Record<string, any>
    schema: z.ZodObject<any>;
}

type OpenAIModel =
    | 'gpt-4o-mini'
    | 'gpt-4o-2024-08-06';
// | 'gpt-3.5-turbo' // Does not support structured output???

const DEFAULT_MODEL: OpenAIModel = 'gpt-4o-mini';

export interface OpenAIConfig {
    apiKey: string;

    model?: OpenAIModel | (string & {});

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
     * Maximum number of retries on timeout
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

const DEBUG_CHUNKS = false;

export function createOpenAITranslateEngine(config: OpenAIConfig): TranslateEngine {
    if (!config.apiKey) {
        throw new Error('OpenAI > Missing apiKey');
    }

    const model = config.model || DEFAULT_MODEL;

    const MAX_CHUNK_SIZE = Math.min(100, Math.max(5, config.chunkSize || 50));
    const TIMEOUT_MS = (config.timeoutSeconds || 25) * 1000;
    const MAX_RETRIES = config.maxRetries || 10;
    const RATE_LIMIT_MULTIPLIER = config.rateLimitRetryMultiplier || 4;
    const RATE_LIMIT_EXTRA_DELAY = config.rateLimitRetryExtraDelay || 1200;

    const openai = new OpenAI({
        apiKey: config.apiKey,
        timeout: TIMEOUT_MS
    });

    // Global timeout synchronization
    let globalTimeoutPromise: Promise<void> | null = null;

    async function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function withRetry<T>(operation: () => Promise<T>, operationName: string, options: TranslateOptions): Promise<T> {
        const logger = options.logger || defaultLogger;
        let lastError: Error;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Wait for any ongoing global timeout before attempting
                if (globalTimeoutPromise) {
                    const startTime = Date.now();
                    await globalTimeoutPromise;
                    const waitTime = Date.now() - startTime;
                    if (waitTime > 0) {
                        logger.engineDebug('OpenAI', `Waited ${waitTime}ms for global timeout synchronization`);
                    }
                }

                return await operation();
            } catch (error) {
                lastError = error as Error;

                const isTimeout = error instanceof Error && (
                    error.message.includes('timeout') ||
                    error.message.includes('ETIMEDOUT') ||
                    error.name === 'TimeoutError' ||
                    error.name === 'APIConnectionTimeoutError' ||
                    error.constructor.name === 'APIConnectionTimeoutError'
                );

                // Check if it's a rate limit error (429)
                const isRateLimit = (error as any)?.status === 429;

                if ((isTimeout || isRateLimit) && attempt < MAX_RETRIES) {
                    if (isRateLimit) {
                        // Get retry-after-ms from headers and multiply by configured multiplier
                        const retryAfterMs = (error as any)?.headers?.['retry-after-ms'];
                        const waitTime = retryAfterMs ? parseInt(retryAfterMs) * RATE_LIMIT_MULTIPLIER + RATE_LIMIT_EXTRA_DELAY : 1000; // Default 1s if no header

                        logger.engineDebug('OpenAI', `Rate limit hit on attempt ${attempt}/${MAX_RETRIES}, waiting ${waitTime}ms before retry...`);

                        // Set global timeout promise so other chunks wait
                        const sleepPromise = sleep(waitTime);
                        globalTimeoutPromise = sleepPromise;
                        const startTime = Date.now();
                        await sleepPromise;
                        const actualWaitTime = Date.now() - startTime;
                        logger.engineDebug('OpenAI', `Waited ${actualWaitTime}ms for rate limit retry`);
                        globalTimeoutPromise = null;
                    } else if (isTimeout) {
                        const timeoutWaitTime = 2000; // 2 second delay for timeout
                        logger.engineDebug('OpenAI', `Timeout on attempt ${attempt}/${MAX_RETRIES}, waiting ${timeoutWaitTime}ms before retry...`);

                        // Set global timeout promise so other chunks wait
                        const sleepPromise = sleep(timeoutWaitTime);
                        globalTimeoutPromise = sleepPromise;
                        const startTime = Date.now();
                        await sleepPromise;
                        const actualWaitTime = Date.now() - startTime;
                        logger.engineDebug('OpenAI', `Waited ${actualWaitTime}ms for timeout retry`);
                        globalTimeoutPromise = null;
                    }
                    continue;
                }

                // If it's not a retryable error or we've exhausted retries, throw the error
                throw error;
            }
        }

        throw lastError!;
    }

    /**
     * OpenAI imposes limitations on structured outputs:
     * - A schema can have up to 100 object properties in total.
     * - Nesting is limited to a maximum depth of 5 levels.
     *
     * Reference: https://platform.openai.com/docs/guides/structured-outputs/objects-have-limitations-on-nesting-depth-and-size
     *
     * To comply with these constraints:
     * - We flatten the structure before sending requests to the API, ensuring each chunk contains at most 100 properties.
     * - Once all chunks receive a response, we reconstruct (unflatten) the structure and merge the results.
     *
     * Schema below counts as 5 properties:
     * const schema = z.object({
     *     pl: z.object({ // 1
     *         foo: z.string(), // 2
     *         bar: z.string(), // 3
     *     }),
     *     jp: z.object({ // 4
     *         xyz: z.string(), // 5
     *     })
     * });
     */
    function prepareTranslationsAndChunkThem(
        flatBaseTranslations: Record<string, string>,
        languagesTranslations: TranslationsByLanguage
    ): OpenAIChunk[] {

        const chunks: OpenAIChunk[] = [];

        let currentChunkSize = 0;
        let currentChunkBaseTranslations: any = {};
        let currentChunkSchema: any = {};

        function pushChunk() {
            chunks.push({
                // We use an unflattened object to save tokens.
                baseTranslations: unflattenObject(currentChunkBaseTranslations),
                schema: DEBUG_CHUNKS ? currentChunkSchema : z.object(currentChunkSchema)
            });
            currentChunkSize = 0;
            currentChunkBaseTranslations = {};
            currentChunkSchema = {};
        }

        for (let languageCode in languagesTranslations) {
            const flat = Object.entries(flattenObject(languagesTranslations[languageCode]));

            let languageObject: any = {};
            do {
                currentChunkSize++; // language code property
                const rest = Math.min(MAX_CHUNK_SIZE - currentChunkSize, flat.length);
                const chunkPart = flat.splice(0, rest);
                for (const [key] of chunkPart) {
                    currentChunkBaseTranslations[key] = flatBaseTranslations[key];
                    languageObject[key] = DEBUG_CHUNKS ? '' : z.string();
                }
                currentChunkSchema[languageCode] = DEBUG_CHUNKS ? languageObject : z.object(languageObject);
                currentChunkSize += rest;
                if (currentChunkSize == MAX_CHUNK_SIZE) {
                    pushChunk();
                    languageObject = {};
                }
            } while (flat.length)


            /**
             * We want to avoid pushing chunks that only contain a language code, e.g.:
             *
             * MAX_CHUNK_SIZE = 3
             *
             * Example of a chunk structure that we want to avoid:
             * {
             *   pl: { // 1
             *     'order.navigation.title': '...' // 2
             *   },
             *   zh: {} // 3
             * }
             *
             * In this example, the chunk for the 'zh' language code is empty, which is undesirable.
             * We want to ensure that only meaningful chunks with actual content are pushed.
             */
            if (currentChunkSize >= MAX_CHUNK_SIZE - 1) {
                pushChunk();
            }
        }

        if (currentChunkSize) pushChunk();

        return chunks;
    }

    async function fetchTranslations(chunks: OpenAIChunk[], options: TranslateOptions) {
        const logger = options.logger || defaultLogger;
        const systemContext = [
            ...ABSOLUTE_CONTEXT,

            toLanguagesContext(options.baseLanguageCode, options.targetLanguageCodes),

            ...options.applicationContextEntries
        ].join(' ');

        async function fetchChunk(chunk: OpenAIChunk) {
            return await withRetry(async () => {
                const response = await openai.beta.chat.completions.parse({
                    model,
                    response_format: zodResponseFormat(chunk.schema, "language_translations"),
                    messages: [
                        { role: 'system', content: systemContext },
                        { role: 'user', content: JSON.stringify(chunk.baseTranslations) }
                    ]
                });

                const translatedChunk = response.choices[0].message.parsed;
                if (!translatedChunk) {
                    throw new Error("Received null translatedChunk from API.");
                }

                return translatedChunk;
            }, 'translate', options);
        }

        const mergedFlat: any = {};

        let fetchedCount = 0;

        const translatedChunks = await Promise.all(
            chunks.map(async (chunk: OpenAIChunk, i: number) => {
                if (chunks.length > 1) {
                    logger.engineDebug('OpenAI', `Fetching chunk ${i + 1}/${chunks.length}`);
                }
                let result = await fetchChunk(chunk);

                fetchedCount++;

                logger.engineDebug('OpenAI', `Fetched chunk ${i + 1} (${fetchedCount}/${chunks.length})`);
                return result;
            })
        );

        logger.engineDebug('OpenAI', `Finished fetching all chunks`);

        for (const translatedChunk of translatedChunks) {
            for (const languageCode in translatedChunk) {
                let mergedLanguageCode = mergedFlat[languageCode];
                if (!mergedLanguageCode) {
                    mergedLanguageCode = {};
                    mergedFlat[languageCode] = mergedLanguageCode;
                }

                for (const path in translatedChunk[languageCode]) {
                    mergedLanguageCode[path] = translatedChunk[languageCode][path];
                }
            }
        }

        // for (let i = 0; i < chunks.length; i++) {
        //     if (options.debug && chunks.length > 1) console.log(`OpenAI translate > Fetching chunk ${i + 1} of ${chunks.length}...`);
        //     const translatedChunk = await fetchChunk(chunks[i]);
        //
        //     for (let languageCode in translatedChunk) {
        //         let mergedLanguageCode = mergedFlat[languageCode];
        //         if (!mergedLanguageCode) {
        //             mergedLanguageCode = {};
        //             mergedFlat[languageCode] = mergedLanguageCode
        //         }
        //
        //         for (let path in translatedChunk[languageCode]) {
        //             mergedLanguageCode[path] = translatedChunk[languageCode][path];
        //         }
        //     }
        // }

        for (let languageCode in mergedFlat) {
            mergedFlat[languageCode] = unflattenObject(mergedFlat[languageCode]);
        }

        return unflattenObject(mergedFlat);
    }

    return {
        name: `OpenAI (${model})`,

        canBeTrustedWithVariablesTranslation: true,

        async translate(
            translations: Record<string, any>,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            const languagesTranslations: any = {}
            for (let targetLanguageCode of options.targetLanguageCodes) {
                languagesTranslations[targetLanguageCode] = translations;
            }

            const chunks = prepareTranslationsAndChunkThem(
                flattenObject(translations),
                languagesTranslations
            )

            return await fetchTranslations(chunks, options);
        },

        async translateMissed(
            missingTranslations: TranslateNamespaceMissingTranslations,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            const chunks = prepareTranslationsAndChunkThem(
                flattenObject(missingTranslations.baseLanguageTranslations),
                missingTranslations.targetLanguageTranslationsKeys
            )

            return await fetchTranslations(chunks, options);
        }
    }
}