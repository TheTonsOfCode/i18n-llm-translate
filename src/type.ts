import {z} from "zod";

export interface TranslateOptions {
    languagesDirectoryPath: string;

    baseLanguageCode: string;
    baseLanguageCodePrefixWithDot: boolean;
    targetLanguageCodes: string[]

    jsonCacheName: string;

    applicationContextEntries: string[],

    debug?: boolean;
}

export interface TranslateEngineTranslateResult {
    [key: string /*languageCode*/]: Record<string, any>;
}

export interface TranslateEngine {

    name: string;

    translate(
        translations: Record<string, any>,
        translationsSchema: z.ZodObject<any>,
        options: TranslateOptions
    ): Promise<TranslateEngineTranslateResult>;

    translateMissed(
        missingTranslations: TranslateNamespaceMissingTranslations,
        translationsSchema: z.ZodObject<any>,
        options: TranslateOptions
    ): Promise<TranslateEngineTranslateResult>;
}

export interface TranslationsByLanguage {
    [languageCode: string]: Record<string, any>;
}

export interface TranslateNamespaceMissingTranslations {

    /**
     * Only these which are missed in target languages
     */
    baseLanguageTranslations: Record<string, any>;

    targetLanguageTranslationsKeys: TranslationsByLanguage;
}

export interface TranslateNamespace {
    jsonFileName: string;

    baseLanguageTranslations: Record<string, any>;

    targetLanguageTranslations: {
        languageCode: string;
        translations: Record<string, any>;
    }[];

    write(): Promise<void>;

    getMissingTranslations(): TranslateNamespaceMissingTranslations | undefined;
}




