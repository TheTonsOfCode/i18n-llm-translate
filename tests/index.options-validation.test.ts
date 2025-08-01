import { describe, it, expect } from 'vitest';
import { validateTranslateOptions } from '../src/validation';
import { TranslateOptions } from '../src/type';

describe('TranslateOptions validation', () => {
    const validOptions: TranslateOptions = {
        languagesDirectoryPath: './locales',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'ja'],
        applicationContextEntries: ['Context entry 1.', 'Context entry 2.']
    };

    describe('valid configurations', () => {
        it('should pass with minimal valid configuration', () => {
            expect(() => validateTranslateOptions(validOptions)).not.toThrow();
        });

        it('should pass with all optional fields', () => {
            const fullOptions: TranslateOptions = {
                ...validOptions,
                namesMapping: {
                    languages: {
                        base: 'base-{language}',
                        targets: 'target-{language}'
                    },
                    jsonCache: '.custom-cache.json'
                },
                cleanup: true,
                debug: true,
                verbose: false
            };

            expect(() => validateTranslateOptions(fullOptions)).not.toThrow();
        });

        it('should pass with function-based languages mapping', () => {
            const optionsWithFunction: TranslateOptions = {
                ...validOptions,
                namesMapping: {
                    languages: (languageCode: string) => `custom-${languageCode}`
                }
            };

            expect(() => validateTranslateOptions(optionsWithFunction)).not.toThrow();
        });
    });

    describe('languagesDirectoryPath validation', () => {
        it('should fail when languagesDirectoryPath is missing', () => {
            const options = { ...validOptions };
            delete (options as any).languagesDirectoryPath;

            expect(() => validateTranslateOptions(options)).toThrow(
                'Configuration validation failed: languagesDirectoryPath: Required'
            );
        });

        it('should fail when languagesDirectoryPath is empty string', () => {
            const options: TranslateOptions = {
                ...validOptions,
                languagesDirectoryPath: ''
            };

            expect(() => validateTranslateOptions(options)).toThrow(
                'Configuration validation failed: languagesDirectoryPath: languagesDirectoryPath is required and cannot be empty'
            );
        });
    });

    describe('baseLanguageCode validation', () => {
        it('should fail when baseLanguageCode is missing', () => {
            const options = { ...validOptions };
            delete (options as any).baseLanguageCode;

            expect(() => validateTranslateOptions(options)).toThrow(
                'Configuration validation failed: baseLanguageCode: Required'
            );
        });

        it('should fail when baseLanguageCode is empty string', () => {
            const options: TranslateOptions = {
                ...validOptions,
                baseLanguageCode: ''
            };

            expect(() => validateTranslateOptions(options)).toThrow(
                'Configuration validation failed: baseLanguageCode: baseLanguageCode is required and cannot be empty'
            );
        });
    });

    describe('targetLanguageCodes validation', () => {
        it('should fail when targetLanguageCodes is missing', () => {
            const options = { ...validOptions };
            delete (options as any).targetLanguageCodes;

            expect(() => validateTranslateOptions(options)).toThrow(
                'Configuration validation failed: targetLanguageCodes: Required'
            );
        });

        it('should fail when targetLanguageCodes is empty array', () => {
            const options: TranslateOptions = {
                ...validOptions,
                targetLanguageCodes: []
            };

            expect(() => validateTranslateOptions(options)).toThrow(
                'Configuration validation failed: targetLanguageCodes: At least one target language code is required'
            );
        });

        it('should fail when targetLanguageCodes contains empty string', () => {
            const options: TranslateOptions = {
                ...validOptions,
                targetLanguageCodes: ['pl', '', 'ja']
            };

            expect(() => validateTranslateOptions(options)).toThrow(
                'Configuration validation failed: targetLanguageCodes.1: String must contain at least 1 character(s)'
            );
        });

        it('should fail when targetLanguageCodes is not an array', () => {
            const options = {
                ...validOptions,
                targetLanguageCodes: 'pl,ja'
            };

            expect(() => validateTranslateOptions(options as any)).toThrow(
                'Configuration validation failed: targetLanguageCodes: Expected array, received string'
            );
        });
    });

    describe('applicationContextEntries validation', () => {
        it('should fail when applicationContextEntries is missing', () => {
            const options = { ...validOptions };
            delete (options as any).applicationContextEntries;

            expect(() => validateTranslateOptions(options)).toThrow(
                'Configuration validation failed: applicationContextEntries: Required'
            );
        });

        it('should pass with empty applicationContextEntries array', () => {
            const options: TranslateOptions = {
                ...validOptions,
                applicationContextEntries: []
            };

            expect(() => validateTranslateOptions(options)).not.toThrow();
        });

        it('should fail when applicationContextEntries is not an array', () => {
            const options = {
                ...validOptions,
                applicationContextEntries: 'some context'
            };

            expect(() => validateTranslateOptions(options as any)).toThrow(
                'Configuration validation failed: applicationContextEntries: Expected array, received string'
            );
        });
    });

    describe('multiple validation errors', () => {
        it('should report multiple validation errors at once', () => {
            const options = {
                languagesDirectoryPath: '',
                baseLanguageCode: '',
                targetLanguageCodes: [],
                applicationContextEntries: 'not-an-array'
            };

            expect(() => validateTranslateOptions(options as any)).toThrow(
                /Configuration validation failed:.*languagesDirectoryPath.*baseLanguageCode.*targetLanguageCodes.*applicationContextEntries/
            );
        });
    });

    describe('optional fields validation', () => {
        it('should pass when optional fields are undefined', () => {
            const options: TranslateOptions = {
                ...validOptions,
                cleanup: undefined,
                debug: undefined,
                verbose: undefined,
                namesMapping: undefined
            };

            expect(() => validateTranslateOptions(options)).not.toThrow();
        });

        it('should fail when boolean fields have wrong type', () => {
            const options = {
                ...validOptions,
                cleanup: 'true',
                debug: 1,
                verbose: null
            };

            expect(() => validateTranslateOptions(options as any)).toThrow(
                /Configuration validation failed:.*cleanup.*debug.*verbose/
            );
        });
    });
});