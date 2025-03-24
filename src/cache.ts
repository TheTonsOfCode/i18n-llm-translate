import {TranslateNamespace, TranslateOptions} from "$/type";
import {formatLanguageContainerDirectoryName, logWithColor} from "$/util";
import {promises as fs} from "fs";
import path from "path";

interface TranslationCacheManager {

    cleanCache(namespaces: TranslateNamespace[]): boolean;

    syncCacheWithNamespaces(namespaces: TranslateNamespace[], writeNamespaceValues: boolean): void;

    getBaseLanguageTranslationDifferences(namespace: TranslateNamespace): Record<string, any> | undefined;

    write(): Promise<void>;
}

export async function readTranslationsCache(options: TranslateOptions): Promise<TranslationCacheManager> {

    const baseLanguageCodeKey = formatLanguageContainerDirectoryName(options.baseLanguageCode, options);

    const cachePath = path.resolve(
        process.env.PWD!,
        options.languagesDirectoryPath,
        options.namesMapping!.jsonCache!
    );

    let content: any = '{}';

    try {
        content = await fs.readFile(cachePath, 'utf-8');
    } catch (error) {
        console.warn(`Translation# Warning: "${cachePath}" not found. Initializing empty JSON.`);
    }

    try {
        content = JSON.parse(content);
    } catch (error) {
        console.error(`Translation# Error reading "${cachePath}". File is not a proper JSON!`);
    }

    return {
        cleanCache(namespaces: TranslateNamespace[]): boolean {
            let dirty = false;
            const namespaceFiles: string[] = namespaces.map(n => n.jsonFileName);
            for (let cachedFile in content) {
                if (!namespaceFiles.includes(cachedFile)) {
                    logWithColor('yellow', `Translation# Warning: Namespace file "${cachedFile}" not found. Clearing it from cache`);
                    delete content[cachedFile];
                    dirty = true;
                }
            }
            return dirty;
        },
        syncCacheWithNamespaces(namespaces: TranslateNamespace[], writeNamespaceValues: boolean) {
            function deepCopy<T>(obj: T): T {
                return JSON.parse(JSON.stringify(obj));
            }

            function walk(
                cache: Record<string, any>,
                baseTranslations: TranslateNamespace['baseLanguageTranslations'],
                targetLanguagesTranslations: TranslateNamespace['targetLanguages']
            ) {
                // Remove keys which are no longer at base translations
                if (typeof baseTranslations === 'object') for (let cacheKey in cache) {
                    if (cacheKey in baseTranslations) {
                        continue;
                    }

                    delete cache[cacheKey];
                    console.log(`Translation# Cache# Removed unknown base path key: "${cacheKey}"`);
                }

                for (let baseKey in baseTranslations) {
                    const baseValue = baseTranslations[baseKey];
                    const isTranslation = typeof baseValue === 'string';

                    let cacheValue = cache[baseKey] || {};

                    if (isTranslation) {
                        // Remove unknown languages
                        for (let languageCode of Object.keys(cacheValue)) {
                            if (languageCode !== baseLanguageCodeKey && !options.targetLanguageCodes.includes(languageCode)) {
                                delete cacheValue[languageCode];
                                console.log(`Translation# Cache# Removed unknown language code: "${languageCode}" in "${baseKey}"`);
                            }
                        }

                        cacheValue[baseLanguageCodeKey] = writeNamespaceValues
                            ? baseValue
                            : cacheValue[baseLanguageCodeKey] || '';

                        for (let targetLanguage of targetLanguagesTranslations) {
                            cacheValue[targetLanguage.languageCode] = writeNamespaceValues
                                ? targetLanguage.translations[baseKey] || ''
                                : cacheValue[targetLanguage.languageCode] || '';
                        }
                    } else {
                        const deeperTargetLanguages = deepCopy(targetLanguagesTranslations);
                        for (let deeperTargetLanguage of deeperTargetLanguages) {
                            deeperTargetLanguage.translations = deeperTargetLanguage.translations[baseKey] || {};
                        }
                        cacheValue = walk(cacheValue, baseValue, deeperTargetLanguages)
                    }

                    cache[baseKey] = cacheValue;
                }

                return cache;
            }

            for (let namespace of namespaces) {
                const cacheNamespace = content[namespace.jsonFileName] || {};

                content[namespace.jsonFileName] = walk(
                    cacheNamespace,
                    deepCopy(namespace.baseLanguageTranslations),
                    deepCopy(namespace.targetLanguages)
                );
            }
        },

        getBaseLanguageTranslationDifferences(namespace: TranslateNamespace): Record<string, any> | undefined {
            const fileCache = content[namespace.jsonFileName];

            if (!fileCache) return namespace.baseLanguageTranslations;

            function walk(
                cache: Record<string, any>,
                baseTranslations: TranslateNamespace['baseLanguageTranslations']
            ): Record<string, any> | undefined {
                if (typeof baseTranslations !== 'object') {
                    return cache;
                }

                const diff: any = {};
                for (const key of Object.keys(baseTranslations)) {
                    if (typeof baseTranslations[key] === "object") {
                        const result = walk(cache[key], baseTranslations[key]);
                        if(result) diff[key] = result;
                        continue;
                    }

                    if (baseTranslations[key] === cache[key]?.[baseLanguageCodeKey]) {
                        continue;
                    }

                    diff[key] = baseTranslations[key];
                }
                if (Object.keys(diff).length === 0) return undefined;
                return diff;
            }

            return walk(fileCache, namespace.baseLanguageTranslations);
        },

        async write() {
            await fs.writeFile(cachePath, JSON.stringify(content, null, 4), 'utf-8');
            console.log(`Translation# Successfully wrote translations cache`);
        },
    }
}