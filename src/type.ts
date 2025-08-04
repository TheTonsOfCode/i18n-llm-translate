import {TranslateLogger} from "$/logger";

export type TranslateOptionsNamesMappingLanguagesCallback = (languageCode: string, options: TranslateOptions) => string;
/**
 * Parameters: {language}
 * Default value: {language}
 */
export type TranslateOptionsNamesMappingLanguagesBasicConfig = {
    base?: string;
    targets?: string;
};
export type TranslateOptionsNamesMappingLanguages = TranslateOptionsNamesMappingLanguagesCallback | TranslateOptionsNamesMappingLanguagesBasicConfig;

export interface TranslateOptionsNamesMapping {
    languages?: TranslateOptionsNamesMappingLanguages;

    /**
     * Default: .translations-cache
     */
    jsonCache?: string;
}

export interface TranslateOptions {
    languagesDirectoryPath: string;

    baseLanguageCode: string;
    targetLanguageCodes: string[];

    namesMapping?: TranslateOptionsNamesMapping;

    applicationContextEntries: string[];

    /**
     * Default: 3
     */
    maxRetriesOnEngineValidationError?: number;
    /**
     * Default: llm-only
     */
    retryOnEngineValidationErrorFor?: 'all' | 'llm-only' | 'none';

    cleanup?: boolean;
    debug?: boolean;
    verbose?: boolean;
    logger?: TranslateLogger;
}

export interface TranslateEngineTranslateResult {
    [key: string /*languageCode*/]: Record<string, any>;
}

export interface TranslateEngine {

    name: string;

    type: 'llm' | 'ml' | 'other';

    canBeTrustedWithVariablesTranslation: boolean;

    // detectLanguage?(
    //     translations: Record<string, any>,
    //     options: TranslateOptions
    // ): Promise<TranslateEngineTranslateResult>;

    translate(
        translations: Record<string, any>,
        options: TranslateOptions
    ): Promise<TranslateEngineTranslateResult>;

    translateMissed(
        missingTranslations: TranslateNamespaceMissingTranslations,
        options: TranslateOptions
    ): Promise<TranslateEngineTranslateResult>;

    estimatePrice?(data: {charactersCount: number}): string | undefined ;
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

    targetLanguages: {
        dirty: boolean;
        languageCode: string;
        translations: Record<string, any>;
    }[];

    write(): Promise<void>;

    getMissingTranslations(): TranslateNamespaceMissingTranslations | undefined;
}


