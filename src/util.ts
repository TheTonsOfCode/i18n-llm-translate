import { TranslateEngineTranslateResult, TranslateOptions } from "$/type";

export function formatLanguageContainerDirectoryName(languageCode: string, options: TranslateOptions): string {
    if (!options.namesMapping) return languageCode;
    if (!options.namesMapping.languages) return languageCode;
    if (typeof options.namesMapping.languages === 'function') return options.namesMapping.languages(languageCode, options);
    if (languageCode === options.baseLanguageCode) {
        if (!options.namesMapping.languages.base) return languageCode;
        return formatLanguageDirectoryName(options.namesMapping.languages.base, languageCode);
    }
    if (!options.namesMapping.languages.targets) return languageCode;
    return formatLanguageDirectoryName(options.namesMapping.languages.targets, languageCode);
}

function extractFirstBracedValue(str: string) {
    const match = str.match(/\{(.*?)}/);
    return match ? match[1] : null;
}

function formatLanguageDirectoryName(format: string, languageCode: string): string {
    const variable = extractFirstBracedValue(format);
    if (!variable) throw new Error(`Invalid format: "${format}". Expected a placeholder like "{language}", but none was found.`);
    const tmp = variable.replace('language', '');
    if (variable === tmp) throw new Error(`Invalid format: "${format}". Found placeholder "{${variable}}", but it does not contain "language".`);
    if (tmp === '!') languageCode = languageCode.toUpperCase();
    if (tmp === '_') languageCode = languageCode.toLowerCase();
    return format.replace(`{${variable}}`, languageCode);
}

export function flattenObject(obj: any, parentKey: string = ''): Record<string, string> {
    let result: Record<string, string> = {};

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = parentKey ? `${parentKey}.${key}` : key;

            if (typeof obj[key] === 'object' && obj[key] !== null) {
                Object.assign(result, flattenObject(obj[key], newKey));
            } else {
                result[newKey] = String(obj[key]);
            }
        }
    }

    return result;
}

export function unflattenObject(flatTranslations: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in flatTranslations) {
        if (flatTranslations.hasOwnProperty(key)) {
            const keys = key.split('.');
            let current = result;

            keys.forEach((part, index) => {
                if (index === keys.length - 1) {
                    current[part] = flatTranslations[key];
                } else {
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }
            });
        }
    }

    return result;
}

export function clearNullsFromResult(result: TranslateEngineTranslateResult): TranslateEngineTranslateResult {
    function walk(obj: any): any {
        if (obj === null || obj === undefined) {
            return undefined;
        }

        if (typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }

        const cleaned: any = {};
        let hasValidKeys = false;

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = walk(obj[key]);

                // Only add the key if the value is not null/undefined
                if (value !== null && value !== undefined) {
                    cleaned[key] = value;
                    hasValidKeys = true;
                }
            }
        }

        // Return undefined if the object is empty after cleaning
        return hasValidKeys ? cleaned : undefined;
    }

    const cleanedResult: TranslateEngineTranslateResult = {};

    for (const languageCode in result) {
        if (result.hasOwnProperty(languageCode)) {
            const cleanedTranslations = walk(result[languageCode]);

            // Only include language if it has valid translations
            if (cleanedTranslations !== undefined) {
                cleanedResult[languageCode] = cleanedTranslations;
            }
        }
    }

    return cleanedResult;
}

export function countTranslatedKeys(result: TranslateEngineTranslateResult): number {
    function countInObject(obj: any): number {
        if (!obj || typeof obj !== 'object') {
            return 0;
        }

        let count = 0;

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                if (typeof value === 'string') {
                    // This is a translation key
                    count++;
                } else if (typeof value === 'object' && value !== null) {
                    // This is a nested object, count recursively
                    count += countInObject(value);
                }
            }
        }

        return count;
    }

    let totalCount = 0;

    // Count translations across all languages
    for (const languageCode in result) {
        if (result.hasOwnProperty(languageCode)) {
            totalCount += countInObject(result[languageCode]);
        }
    }

    return totalCount;
}

export function countTranslatedCharacters(obj: any): number {
    function countInObject(obj: any): number {
        if (!obj || typeof obj !== 'object') {
            return 0;
        }

        let count = 0;

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                if (typeof value === 'string') {
                    // Count characters in translation value
                    count += value.length;
                } else if (typeof value === 'object' && value !== null) {
                    // This is a nested object, count recursively
                    count += countInObject(value);
                }
            }
        }

        return count;
    }

    return countInObject(obj);
}

export function countKeysInObject(obj: any): number {
    function countInObject(obj: any): number {
        if (!obj || typeof obj !== 'object') {
            return 0;
        }

        let count = 0;

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                if (typeof value === 'string') {
                    // This is a translation key
                    count++;
                } else if (typeof value === 'object' && value !== null) {
                    // This is a nested object, count recursively
                    count += countInObject(value);
                }
            }
        }

        return count;
    }

    return countInObject(obj);
}

export function countMissingTranslationCharacters(
    baseLanguageTranslations: Record<string, any>,
    targetLanguageTranslationsKeys: Record<string, any>
): number {
    function countCharactersForPath(
        basePath: string,
        baseObj: any,
        targetLanguages: Record<string, any>
    ): number {
        if (typeof baseObj === 'string') {
            // Count how many target languages need this translation
            let languageCount = 0;
            for (const languageCode in targetLanguages) {
                if (hasPathInObject(targetLanguages[languageCode], basePath)) {
                    languageCount++;
                }
            }
            return baseObj.length * languageCount;
        }

        if (typeof baseObj === 'object' && baseObj !== null) {
            let totalChars = 0;
            for (const key in baseObj) {
                if (baseObj.hasOwnProperty(key)) {
                    const newPath = basePath ? `${basePath}.${key}` : key;
                    totalChars += countCharactersForPath(newPath, baseObj[key], targetLanguages);
                }
            }
            return totalChars;
        }

        return 0;
    }

    return countCharactersForPath('', baseLanguageTranslations, targetLanguageTranslationsKeys);
}

function hasPathInObject(obj: any, path: string): boolean {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (!current.hasOwnProperty(key)) {
            return false;
        }
        current = current[key];
    }

    return true;
}

export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`;
    } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
    } else {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(1);
        return `${minutes}m ${seconds}s`;
    }
}