import {
    TranslateEngine,
    TranslateEngineTranslateResult,
    TranslateNamespaceMissingTranslations,
    TranslateOptions
} from "$/type";
import {z} from "zod";

export function createDummyTranslateEngine(prefix: string = '$lng-dummy__'): TranslateEngine {

    function prefixStrings(obj: any, prefix: string): any {
        if (typeof obj === 'string') {
            return `${prefix}${obj}`;
        } else if (Array.isArray(obj)) {
            return obj.map(value => prefixStrings(value, prefix));
        } else if (typeof obj === 'object' && obj !== null) {
            return Object.fromEntries(
                Object.entries(obj).map(([key, value]) => [key, prefixStrings(value, prefix)])
            );
        }
        return obj;
    }

    return {
        name: 'Dummy (Flow testing)',
        async translate(
            translations: Record<string, any>,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            const languages: any = {};

            for (let targetLanguageCode of options.targetLanguageCodes) {

                languages[targetLanguageCode] = prefixStrings(translations, prefix.replace('$lng', targetLanguageCode));
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

                languages[targetLanguageCode] = prefixStrings(targetLanguageTranslationsKeys[targetLanguageCode], prefix.replace('$lng', targetLanguageCode));

            }

            return languages;
        }
    }
}