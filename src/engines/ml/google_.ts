import {
    TranslateEngine,
    TranslateEngineTranslateResult,
    TranslateNamespaceMissingTranslations,
    TranslateOptions
} from "$/type";
import {flattenObject, unflattenObject} from "$/util";
import {defaultLogger} from "$/logger";

interface GoogleTranslateTextResult {
    translatedText: string;
    detectedSourceLanguage?: string;
}

interface GoogleTranslateSuccessResult {
    data: {
        translations: GoogleTranslateTextResult[];
    };
}

export interface GoogleTranslateConfig {
    apiKey: string;
}

export function createGoogleTranslateEngine(config: GoogleTranslateConfig): TranslateEngine {
    if (!config.apiKey) {
        throw new Error('Google Translate > Missing apiKey');
    }

    const API_BASE = 'https://translation.googleapis.com/language/translate/v2';

    async function fetchTranslations(targetLanguageCode: string, translations: string[], options: TranslateOptions): Promise<GoogleTranslateSuccessResult> {
        const url = new URL(API_BASE);
        url.searchParams.append('key', config.apiKey);

        const body = {
            q: translations,
            target: targetLanguageCode,
            source: options.baseLanguageCode,
            format: 'text'
        };

        const result = await fetch(url.toString(), {
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
        });

        if (!result.ok) {
            const errorText = await result.text();
            throw new Error(`Google Translate API error: ${result.status}\n${errorText}`);
        }

        return JSON.parse(await result.text());
    }

    return {
        name: 'Google Translate',

        type: 'ml',

        canBeTrustedWithVariablesTranslation: false,

        async translate(
            translations: Record<string, any>,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            const flatTranslations = flattenObject(translations);
            const languagesTranslations: any = {};

            const logger = options.logger || defaultLogger;

            for (let targetLanguageCode of options.targetLanguageCodes) {
                logger.engineDebug('Google Translate', `Translating '${options.baseLanguageCode}' > '${targetLanguageCode}'`);
                const baseTranslationsValues = Object.values(flatTranslations);

                const result = await fetchTranslations(targetLanguageCode, baseTranslationsValues, options);

                const languageTranslations: any = {};

                const keys = Object.keys(flatTranslations);
                for (let i = 0; i < result.data.translations.length; i++) {
                    languageTranslations[keys[i]] = result.data.translations[i].translatedText;
                }

                languagesTranslations[targetLanguageCode] = unflattenObject(languageTranslations);
            }

            return languagesTranslations;
        },

        async translateMissed(
            missingTranslations: TranslateNamespaceMissingTranslations,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            const flatBaseTranslations = flattenObject(missingTranslations.baseLanguageTranslations);
            const languagesTranslations: any = {};

            const logger = options.logger || defaultLogger;

            for (let targetLanguageCode in missingTranslations.targetLanguageTranslationsKeys) {
                logger.engineDebug('Google Translate', `Translating '${options.baseLanguageCode}' > '${targetLanguageCode}'`);
                const missingKeys = Object.keys(flattenObject(missingTranslations.targetLanguageTranslationsKeys[targetLanguageCode]));

                const missingValues: string[] = [];
                for (let missingKey of missingKeys) {
                    missingValues.push(flatBaseTranslations[missingKey]);
                }

                const result = await fetchTranslations(targetLanguageCode, missingValues, options);

                const languageTranslations: any = {};

                for (let i = 0; i < result.data.translations.length; i++) {
                    languageTranslations[missingKeys[i]] = result.data.translations[i].translatedText;
                }

                languagesTranslations[targetLanguageCode] = unflattenObject(languageTranslations);
            }

            return languagesTranslations;
        }
    };
}
