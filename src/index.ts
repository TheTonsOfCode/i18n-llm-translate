import {readTranslationsCache} from "$/cache";
import {cleanLanguagesDirectory, cleanNamespaces} from "$/cleaner";
import {applyEngineTranslations, readTranslationsNamespaces} from "$/namespace";
import {TranslateEngine, TranslateOptions} from "$/type";
import {logWithColor} from "$/util";
import { z } from "zod";
import {createCacheTranslateEngine} from "$/engines/cache";

export async function translate(engine: TranslateEngine, options: TranslateOptions) {
    // We filter out base language, as it is used only as reference
    options.targetLanguageCodes = options.targetLanguageCodes.filter(languageCode => languageCode !== options.baseLanguageCode);
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

    console.log(`Translation# Using engine: "${engine.name}"`);

    let dirty = false;

    for (let namespace of namespaces) {
        const baseDifferences = cache.getBaseLanguageTranslationDifferences(namespace);

        if (baseDifferences) {
            dirty = true;

            const baseDifferencesSchema = generateTranslationsZodSchema(baseDifferences);
            const engineResultSchema = generateLanguagesTranslateReturnZodSchema(options.targetLanguageCodes, baseDifferencesSchema);

            console.log(`Translation# Translating base differences for namespace: "${namespace.jsonFileName}".`);
            const translationsResults = await engine.translate(baseDifferences, options);

            const engineCheck = engineResultSchema.safeParse(translationsResults);

            if (!engineCheck.success) {
                logWithColor('red', `Translation# Engine does not returned proper translation structure!`);
                logWithColor('red', `Translation# Base differences:`, baseDifferences);
                logWithColor('red', `Translation# Validation error:`, engineCheck.error.issues);
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
            console.log(namespace.jsonFileName, JSON.stringify(missed, null, 2));

            const translationsResults = await cacheEngine.translateMissed(missed, options);

            applyEngineTranslations(namespace, translationsResults);
            // console.log(111, JSON.stringify(translationsResults, null, 2));
        }

        missed = namespace.getMissingTranslations();

        console.log(333, namespace.jsonFileName, JSON.stringify(missed, null, 2));

        // if (missed) {
        //     dirty = true;
        //
        //     // "Missed" translations are already structured according to their respective languages.
        //     // Different languages may have varying missing translations,
        //     // unlike differential translations based on the primary language.
        //     const engineResultSchema = generateTranslationsZodSchema(missed.targetLanguageTranslationsKeys);
        //
        //     console.log(`Translation# Translating missed translations for namespace: "${namespace.jsonFileName}".`);
        //     if (options.debug) console.log(`Translation# Missed translations`) //: `, JSON.stringify(missed, null, 2));
        //     // `baseLanguageTranslations` contains merged missing translations, regardless of the language,
        //     // while avoiding duplicates. This reduces the required context, leading to lower token consumption.
        //     const translationsResults = await engine.translateMissed(missed, options);
        //
        //     const engineCheck = engineResultSchema.safeParse(translationsResults);
        //
        //     if (!engineCheck.success) {
        //         logWithColor('red', `Translation# Engine does not returned proper translation structure!`);
        //         logWithColor('red', `Translation# Validation error:`, engineCheck.error.issues);
        //         return;
        //     }
        //
        //     applyEngineTranslations(namespace, translationsResults)
        // }
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

        logWithColor('green', `Translation# Translated and saved successfully`);
    } else {
        logWithColor('green', `Translation# No changes detected.`);
    }
}

function generateLanguagesTranslateReturnZodSchema(targetLanguages: string[], differencesSchema: z.ZodObject<any>): z.ZodObject<any> {
    const object: any = {};
    for (let targetLanguage of targetLanguages) {
        object[targetLanguage] = differencesSchema;
    }
    return z.object(object);
}

function generateTranslationsZodSchema(obj: Record<string, any>): z.ZodObject<any> {
    const object: any = {};
    for (let [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
            object[key] = z.string();
        } else if (typeof value === "object" && value !== null) {
            object[key] = generateTranslationsZodSchema(value);
        } else {
            throw new Error(`Invalid type for key '${key}': Expected string or object.`);
        }
    }
    return z.object(object);
}