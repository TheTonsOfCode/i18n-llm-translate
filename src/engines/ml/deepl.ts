import {
    TranslateEngine,
    TranslateEngineTranslateResult,
    TranslateNamespaceMissingTranslations,
    TranslateOptions
} from "$/type";
import {flattenObject, unflattenObject} from "$/util";
import {defaultLogger} from "$/logger";

interface DeepLTranslationEntry {
    detected_source_language: string,
    text: string
}

interface DeepLSuccessResult {
    translations: DeepLTranslationEntry[]
}

export interface DeepLConfig {
    apiKey: string;
}

export function createDeepLTranslateEngine(config: DeepLConfig): TranslateEngine {
    if (!config.apiKey) {
        throw new Error('DeepL > Missing apiKey');
    }

    const API_BASE = 'https://api.deepl.com/v2/';

    async function fetchTranslations(targetLanguageCode: string, translations: string[], options: TranslateOptions): Promise<DeepLSuccessResult> {
        const bodyParams = new URLSearchParams();

        bodyParams.append('auth_key', config.apiKey);
        bodyParams.append('source_lang', options.baseLanguageCode.toUpperCase());
        bodyParams.append('target_lang', targetLanguageCode.toUpperCase());

        translations.forEach((text) => bodyParams.append('text', text));

        const result = await fetch(`${API_BASE}translate`, {
            body: bodyParams,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'POST',
        });

        if (!result.ok) {
            const errorText = await result.text();
            throw new Error(`DeepL API error: ${result.status}\n${errorText}`);
        }

        return JSON.parse(await result.text());
    }

    return {
        name: 'DeepL',

        type: 'ml',

        canBeTrustedWithVariablesTranslation: false,

        async translate(
            translations: Record<string, any>,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            // TODO: Change for 'walk' method in future

            const flatTranslations = flattenObject(translations);

            const languagesTranslations: any = {}

            const logger = options.logger || defaultLogger;

            for (let targetLanguageCode of options.targetLanguageCodes) {
                logger.engineDebug('DeepL', `Translating '${options.baseLanguageCode}' > '${targetLanguageCode}'`);
                const baseTranslationsValues = Object.values(flatTranslations);

                const result = await fetchTranslations(targetLanguageCode, baseTranslationsValues, options);

                const languageTranslations: any = {}

                const keys = Object.keys(flatTranslations);
                for (let i = 0; i < result.translations.length; i++) {
                    languageTranslations[keys[i]] = result.translations[i].text;
                }

                languagesTranslations[targetLanguageCode] = unflattenObject(languageTranslations);
            }

            return languagesTranslations;
        },

        async translateMissed(
            missingTranslations: TranslateNamespaceMissingTranslations,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            // TODO: Change for 'walk' method in future

            const flatBaseTranslations = flattenObject(missingTranslations.baseLanguageTranslations);

            const languagesTranslations: any = {}

            const logger = options.logger || defaultLogger;

            for (let targetLanguageCode in missingTranslations.targetLanguageTranslationsKeys) {
                logger.engineDebug('DeepL', `Translating '${options.baseLanguageCode}' > '${targetLanguageCode}'`);
                const missingKeys = Object.keys(flattenObject(missingTranslations.targetLanguageTranslationsKeys[targetLanguageCode]));

                const missingValues: string[] = []
                for (let missingKey of missingKeys) {
                    missingValues.push(flatBaseTranslations[missingKey]);
                }

                const result = await fetchTranslations(targetLanguageCode, missingValues, options);

                const languageTranslations: any = {}

                for (let i = 0; i < result.translations.length; i++) {
                    languageTranslations[missingKeys[i]] = result.translations[i].text;
                }

                languagesTranslations[targetLanguageCode] = unflattenObject(languageTranslations);
            }

            return languagesTranslations;
        }
    }
}
