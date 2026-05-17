import { readTranslationsCache } from "$/cache";
import { cleanLanguagesDirectory, cleanNamespaces } from "$/cleaner";
import { applyEngineTranslations, readTranslationsNamespaces, stripEmptyStringLeavesFromDiff } from "$/namespace";
import { TranslateEngine, TranslateOptions } from "$/type";
import { clearNullsFromResult, countTranslatedKeys, countTranslatedCharacters, countKeysInObject, countMissingTranslationCharacters, formatDuration } from "$/util";
import { defaultLogger } from "$/logger";
import { createCacheTranslateEngine } from "$/engines/cache";
import {
    validateTranslateOptions,
    generateLanguagesTranslateReturnZodSchema,
    generateTranslationsZodSchema
} from "$/validation";
import { isBreakSilentError } from "$/break-silent-error";

export async function translate(engine: TranslateEngine, options: TranslateOptions) {
    if (!process.env.TEST_ENGINES && engine.type !== 'llm' && engine.type !== 'ml') {
        throw new Error('Wrong translate engine');
    }

    const startTime = Date.now();

    // Setup logger
    const logger = options.logger || defaultLogger;
    if (options.debug !== undefined) logger.setDebug?.(options.debug);
    if (options.verbose !== undefined) logger.setVerbose?.(options.verbose);

    // Validate configuration before filtering
    validateTranslateOptions(options);

    options.baseLanguageCode = options.baseLanguageCode.toLowerCase();
    options.targetLanguageCodes = options.targetLanguageCodes.map(languageCode => languageCode.toLowerCase());

    // We filter out base language, as it is used only as reference
    options.targetLanguageCodes = options.targetLanguageCodes.filter(languageCode => languageCode !== options.baseLanguageCode);

    // If no target languages remain after filtering, return early
    if (options.targetLanguageCodes.length === 0) {
        logger.info('No target languages to translate after filtering out base language');
        return;
    }

    // We operate only on json cache
    if (!options.namesMapping) options.namesMapping = {};
    if (!options.namesMapping.jsonCache) options.namesMapping.jsonCache = '.translations-cache';
    if (!options.namesMapping.jsonCache.endsWith(".json")) options.namesMapping.jsonCache = `${options.namesMapping.jsonCache}.json`;
    // Fix application context. Each entry is treated as separate sentence
    for (let i = 0; i < options.applicationContextEntries.length; i++) {
        let entry = options.applicationContextEntries[i].trim();
        if (!entry.endsWith(".")) entry = `${entry}.`
        options.applicationContextEntries[i] = entry;
    }
    if (options.maxRetriesOnEngineValidationError === undefined) options.maxRetriesOnEngineValidationError = 3;
    if (!options.retryOnEngineValidationErrorFor) options.retryOnEngineValidationErrorFor = 'llm-only';

    try {
        await runTranslatePipeline(engine, options, startTime);
    } catch (e) {
        if (isBreakSilentError(e)) {
            logger.error(e.message);
            if (options.verboseEngineErrors) {
                throw e;
            }
            return;
        }
        throw e;
    }
}

async function runTranslatePipeline(engine: TranslateEngine, options: TranslateOptions, startTime: number): Promise<void> {
    const logger = options.logger || defaultLogger;

    let namespaces = await readTranslationsNamespaces(options);

    const cache = await readTranslationsCache(options);

    if (options.cleanup) {
        // Remove files that are neither language directories nor cache file
        const dirtyNamespaces = await cleanLanguagesDirectory(options);

        if (dirtyNamespaces) namespaces = await readTranslationsNamespaces(options);

        // Clean each language directory by removing files that are not namespace files from the base language directory
        await cleanNamespaces(options, namespaces);
    }
    const dirtyCache = cache.cleanCache(namespaces);

    // Fix cache structure so it matches all paths with base namespaces
    cache.syncCacheWithNamespaces(namespaces, false);

    logger.info(`Using engine: "${engine.name}"`);
    if (engine.initializeEstimate) {
        const estimateInitialization = await engine.initializeEstimate(options);
        if (estimateInitialization.message) {
            const message = `Estimate engine: ${estimateInitialization.message}`;
            if (estimateInitialization.ok) {
                logger.info(message);
            } else {
                logger.warn(message);
            }
        }
    }

    let dirty = false;
    let totalBaseDifferencesCount = 0;
    let totalBaseDifferencesTranslationCount = 0;
    let totalMissingTranslationCount = 0;
    let totalCacheLoadedCount = 0;
    let totalCharactersTranslated = 0;
    let totalSourceKeysTranslated = 0;

    for (let namespace of namespaces) {
        let baseDifferences = cache.getBaseLanguageTranslationDifferences(namespace);

        if (baseDifferences) {
            baseDifferences = stripEmptyStringLeavesFromDiff(baseDifferences, namespace);
            if (namespace.targetLanguages.some(tl => tl.dirty)) {
                dirty = true;
            }
        }

        if (baseDifferences) {
            totalBaseDifferencesCount += countKeysInObject(baseDifferences);
            dirty = true;

            const baseDifferencesSchema = generateTranslationsZodSchema(baseDifferences);
            const engineResultSchema = generateLanguagesTranslateReturnZodSchema(options.targetLanguageCodes, baseDifferencesSchema);

            logger.info(`Translating base differences for namespace: "${namespace.jsonFileName}"`);

            // Count characters and keys from source text being sent for translation
            totalCharactersTranslated += countTranslatedCharacters(baseDifferences) * options.targetLanguageCodes.length;
            totalSourceKeysTranslated += countKeysInObject(baseDifferences);

            const translationsResults = await engine.translate(baseDifferences, options);

            const engineCheck = engineResultSchema.safeParse(translationsResults);

            // TODO: RETRIES

            if (!engineCheck.success) {
                logger.error(`Engine does not returned proper translation structure!`);
                logger.debug(`Base differences:`, baseDifferences);
                logger.error(`Validation error:`, engineCheck.error.issues);
                return;
            }

            totalBaseDifferencesTranslationCount += countTranslatedKeys(translationsResults);

            applyEngineTranslations(namespace, translationsResults)
        }
    }

    // Find missing translations
    for (let namespace of namespaces) {
        const cacheEngine = createCacheTranslateEngine(cache, namespace.jsonFileName);

        let missed = namespace.getMissingTranslations();

        if (missed) {
            dirty = true;

            const translationsResults = await cacheEngine.translateMissed(missed, options);

            // Cache results can be nullish, we clear them so they are not written back to cache
            const cleanedResult = clearNullsFromResult(translationsResults);

            // Count how many translations were loaded from cache
            totalCacheLoadedCount += countTranslatedKeys(cleanedResult);

            applyEngineTranslations(namespace, cleanedResult);
        }

        missed = namespace.getMissingTranslations();

        if (missed) {
            dirty = true;

            // "Missed" translations are already structured according to their respective languages.
            // Different languages may have varying missing translations,
            // unlike differential translations based on the primary language.
            const engineResultSchema = generateTranslationsZodSchema(missed.targetLanguageTranslationsKeys);

            logger.info(`Translating missed translations for namespace: "${namespace.jsonFileName}"`);
            logger.debug(`Missed translations structure prepared`);

            // Count characters and keys from source text being sent for translation
            // For missing translations, we need to count characters multiplied by target languages that need them
            totalCharactersTranslated += countMissingTranslationCharacters(
                missed.baseLanguageTranslations,
                missed.targetLanguageTranslationsKeys
            );
            totalSourceKeysTranslated += countKeysInObject(missed.baseLanguageTranslations);

            // `baseLanguageTranslations` contains merged missing translations, regardless of the language,
            // while avoiding duplicates. This reduces the required context, leading to lower token consumption.
            const translationsResults = await engine.translateMissed(missed, options);

            const engineCheck = engineResultSchema.safeParse(translationsResults);

            // TODO: RETRIES

            if (!engineCheck.success) {
                logger.error(`Engine does not returned proper translation structure!`);
                logger.error(`Validation error:`, engineCheck.error.issues);
                return;
            }

            totalMissingTranslationCount += countTranslatedKeys(translationsResults);

            applyEngineTranslations(namespace, translationsResults)
        }
    }

    if (totalCacheLoadedCount > 0) {
        logger.info(`Total translations loaded from cache: ${totalCacheLoadedCount}`);
    }

    if (dirty || dirtyCache) {
        // Overwrite cache with namespace values
        if (dirty) cache.syncCacheWithNamespaces(namespaces, true);

        await cache.write();
    }

    if (dirty) {
        for (let namespace of namespaces) {
            await namespace.write();
        }

        const duration = Date.now() - startTime;

        logger.info(`Total source keys sent for translation: ${totalSourceKeysTranslated}`);
        logger.info(`Total translations processed: ${totalBaseDifferencesTranslationCount + totalMissingTranslationCount}`);
        if (totalMissingTranslationCount) {
            logger.info(` of which ${totalMissingTranslationCount} were missing`);
        }
        logger.info(`Total characters sent for translation: ${totalCharactersTranslated}`);
        
        const usage = engine.getUsage?.() || {charactersCount: totalCharactersTranslated};
        if ('inputTokens' in usage) {
            logger.info(`Total tokens sent for translation: input ${usage.inputTokens}, output ${usage.outputTokens}`);
        }

        if (engine.estimatePrice && ('charactersCount' in usage ? usage.charactersCount > 0 : true)) {
            const priceEstimate = engine.estimatePrice(usage);
            if (typeof priceEstimate === 'string') {
                logger.info(`Estimated cost: ${priceEstimate}`);
            } else if (priceEstimate) {
                logger.info(`Estimated cost: ${priceEstimate.formatted}`);
                if (!priceEstimate.available && priceEstimate.message) {
                    logger.warn(priceEstimate.message);
                }
            }
        }

        logger.success(`Translated and saved successfully in ${formatDuration(duration)}`);
    } else {
        const duration = Date.now() - startTime;
        logger.success(`No changes detected (completed in ${formatDuration(duration)})`);
    }
}

