import {
    TranslateEngine,
    TranslateEngineTranslateResult,
    TranslateNamespaceMissingTranslations,
    TranslateOptions
} from "$/type";
import {TranslationCacheManager} from "$/cache";

export function createCacheTranslateEngine(cacheManager: TranslationCacheManager, namespaceFile: string): TranslateEngine {

    const cache = cacheManager.cache[namespaceFile];

    function walkCache(
        language: string,
        value: any,
        cache: any
    ): any {
        if (!cache) return null;
        if (typeof value === 'string') {
            const cachedTranslation = cache[language];
            return cachedTranslation ? cachedTranslation : null;
        } else if (typeof value === 'object' && value !== null) {
            return Object.fromEntries(
                Object.entries(value).map(([key, value]) => [key, walkCache(language, value, cache[key])])
            );
        }
        return value;
    }

    return {
        name: 'Cache',
        async translate(
            translations: Record<string, any>,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            const languages: any = {};

            for (let targetLanguageCode of options.targetLanguageCodes) {
                languages[targetLanguageCode] = walkCache(
                    targetLanguageCode,
                    translations,
                    cache
                );
            }

            return languages;
        },
        translateMissed(
            {
                targetLanguageTranslationsKeys
            }: TranslateNamespaceMissingTranslations,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {
            const languages: any = {};

            for (let targetLanguageCode in targetLanguageTranslationsKeys) {

                languages[targetLanguageCode] = walkCache(
                    targetLanguageCode,
                    targetLanguageTranslationsKeys[targetLanguageCode],
                    cache
                );

            }

            return languages;
        }
    }
}