import {TranslateEngineTranslateResult, TranslateOptions} from "$/type";

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

export function logWithColor(color: 'red' | 'green' | 'yellow', firstMessage: string, ...otherMessages: any[]) {
    const colorCodes: Record<string, string> = {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m"
    };

    const colorCode = colorCodes[color] || "\x1b[0m"; // Default to reset if invalid color

    console.log(`${colorCode}%s\x1b[0m`, firstMessage, ...otherMessages);
}

export function clearNullsFromResult(result: TranslateEngineTranslateResult) {
    function walk() {

    }
}