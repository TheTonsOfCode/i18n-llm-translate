import {
    TranslateEngine,
    TranslateEngineTranslateResult,
    TranslateNamespaceMissingTranslations,
    TranslateOptions
} from "$/type";

/**
 *
 * @param valueFormat (parameters: $languageCode, $value)
 */
export function createDummyTranslateEngine(valueFormat: string = '$languageCode-dummy__$value'): TranslateEngine {

    function formatStrings(obj: any, valueFormat: string): any {
        if (typeof obj === 'string') {
            return valueFormat.replace('$value', obj);
        } else if (Array.isArray(obj)) {
            return obj.map(value => formatStrings(value, valueFormat));
        } else if (typeof obj === 'object' && obj !== null) {
            return Object.fromEntries(
                Object.entries(obj).map(([key, value]) => [key, formatStrings(value, valueFormat)])
            );
        }
        return obj;
    }

    function replaceLang(languageCode: string): string {
        return valueFormat
            .replace('$languageCode', languageCode)
    }

    return {
        name: 'Dummy (Flow testing)',
        async translate(
            translations: Record<string, any>,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            const languages: any = {};

            for (let targetLanguageCode of options.targetLanguageCodes) {

                languages[targetLanguageCode] = formatStrings(translations, replaceLang(targetLanguageCode));
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

                languages[targetLanguageCode] = formatStrings(targetLanguageTranslationsKeys[targetLanguageCode], replaceLang(targetLanguageCode));

            }

            return languages;
        }
    }
}