import { readTranslationsCache } from "$/cache";
import { cleanLanguagesDirectory, cleanNamespaces } from "$/cleaner";
import { applyEngineTranslations, readTranslationsNamespaces } from "$/namespace";
import { TranslateEngine, TranslateOptions } from "$/type";
import {clearNullsFromResult, countTranslatedKeys, formatDuration} from "$/util";
import { defaultLogger } from "$/logger";
import { createCacheTranslateEngine } from "$/engines/cache";
import { validateTranslateOptions, generateLanguagesTranslateReturnZodSchema, generateTranslationsZodSchema } from "$/validation";

export async function translate(engine: TranslateEngine, options: TranslateOptions) {
    const startTime = Date.now();

    // Setup logger
    const logger = options.logger || defaultLogger;
    if (options.debug !== undefined) logger.setDebug?.(options.debug);
    if (options.verbose !== undefined) logger.setVerbose?.(options.verbose);

    // Validate configuration before filtering
    validateTranslateOptions(options);
    
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

    const namespaces = await readTranslationsNamespaces(options);

    const cache = await readTranslationsCache(options);

    if (options.cleanup) {
        // Remove files that are neither language directories nor cache file
        await cleanLanguagesDirectory(options);
        // Clean each language directory by removing files that are not namespace files from the base language directory
        await cleanNamespaces(options, namespaces);
    }
    const dirtyCache = cache.cleanCache(namespaces);

    // Fix cache structure so it matches all paths with base namespaces
    cache.syncCacheWithNamespaces(namespaces, false);

    logger.info(`Using engine: "${engine.name}"`);

    let dirty = false;
    let totalCacheLoadedCount = 0;

    for (let namespace of namespaces) {
        const baseDifferences = cache.getBaseLanguageTranslationDifferences(namespace);

        if (baseDifferences) {
            dirty = true;

            const baseDifferencesSchema = generateTranslationsZodSchema(baseDifferences);
            const engineResultSchema = generateLanguagesTranslateReturnZodSchema(options.targetLanguageCodes, baseDifferencesSchema);

            logger.info(`Translating base differences for namespace: "${namespace.jsonFileName}"`);
            const translationsResults = await engine.translate(baseDifferences, options);

            const engineCheck = engineResultSchema.safeParse(translationsResults);

            if (!engineCheck.success) {
                logger.error(`Engine does not returned proper translation structure!`);
                logger.debug(`Base differences:`, baseDifferences);
                logger.error(`Validation error:`, engineCheck.error.issues);
                return;
            }

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
            const cacheLoadedCount = countTranslatedKeys(cleanedResult);
            totalCacheLoadedCount += cacheLoadedCount;

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
            // `baseLanguageTranslations` contains merged missing translations, regardless of the language,
            // while avoiding duplicates. This reduces the required context, leading to lower token consumption.
            const translationsResults = await engine.translateMissed(missed, options);

            const engineCheck = engineResultSchema.safeParse(translationsResults);

            if (!engineCheck.success) {
                logger.error(`Engine does not returned proper translation structure!`);
                logger.error(`Validation error:`, engineCheck.error.issues);
                return;
            }

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
        logger.success(`Translated and saved successfully in ${formatDuration(duration)}`);
    } else {
        const duration = Date.now() - startTime;
        logger.success(`No changes detected (completed in ${formatDuration(duration)})`);
    }
}

