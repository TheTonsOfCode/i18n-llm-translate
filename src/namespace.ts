import {
    TranslateEngineTranslateResult,
    TranslateNamespace,
    TranslateNamespaceMissingTranslations,
    TranslateOptions
} from "$/type";
import {formatLanguageContainerDirectoryName} from "$/util";
import {defaultLogger} from "$/logger";
import path from "path";
import {promises as fs} from 'fs';

function validateTranslationStructure(content: any): void {
    if (typeof content !== 'object' || content === null || Array.isArray(content)) {
        throw new Error('Translation# Translation content must be an object with string values or nested objects. Arrays are not allowed.');
    }

    for (const key of Object.keys(content)) {
        if (key.includes('.')) {
            throw new Error(`Translation# Invalid key '${key}': Keys cannot contain dots.`);
        }

        if (typeof content[key] === 'object' && content[key] !== null) {
            validateTranslationStructure(content[key]);
        } else if (typeof content[key] !== 'string') {
            throw new Error(`Translation# Invalid value for key '${key}': Only strings are allowed as values.`);
        } else if (!content[key].trim()) {
            throw new Error(`Translation# Invalid value for key '${key}': Values cannot be empty strings`);
        }
    }
}

// Remove unused keys inside of target translations
function cleanTargetTranslations(baseContent: any, targetContent: any): any {
    if (typeof baseContent !== 'object' || typeof targetContent !== 'object') {
        return targetContent;
    }

    const cleanedContent: any = {};
    for (const key of Object.keys(baseContent)) {
        if (key in targetContent) {
            cleanedContent[key] = cleanTargetTranslations(baseContent[key], targetContent[key]);
        }
    }
    return cleanedContent;
}

export async function readTranslationsNamespaces(options: TranslateOptions): Promise<TranslateNamespace[]> {
    const logger = options.logger || defaultLogger;

    const languagesDirectory = path.resolve(
        process.env.PWD!,
        options.languagesDirectoryPath,
    );

    const baseLanguageDirectory = path.resolve(
        languagesDirectory,
        formatLanguageContainerDirectoryName(options.baseLanguageCode, options)
    );

    const namespaces: TranslateNamespace[] = [];

    const namespaceFiles = await fs.readdir(baseLanguageDirectory);
    for (const fileName of namespaceFiles) {
        if (!fileName.endsWith('.json')) {
            continue;
        }

        try {
            const filePath = path.join(baseLanguageDirectory, fileName);
            let content: any = await fs.readFile(filePath, 'utf-8');

            try {
                content = JSON.parse(content);
            } catch {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error('File is not a proper JSON!');
            }

            namespaces.push({
                jsonFileName: fileName,
                baseLanguageTranslations: content,
                targetLanguages: [],
                async write(): Promise<void> {
                    const savedLanguages: string[] = []

                    for (let targetLanguageCode of options.targetLanguageCodes) {
                        const targetLanguage = this.targetLanguages
                            .find(t => t.languageCode === targetLanguageCode)!;

                        if (!targetLanguage.dirty) continue;

                        const targetFilePath = path.join(languagesDirectory, formatLanguageContainerDirectoryName(targetLanguageCode, options), fileName);
                        try {
                            let targetContent: any = targetLanguage.translations;

                            await fs.writeFile(targetFilePath, JSON.stringify(targetContent, null, 4), 'utf-8');
                            savedLanguages.push(targetLanguageCode);
                        } catch (error) {
                            logger.error(`Error writing to ${targetFilePath}:`, error);
                        }
                    }

                    if (savedLanguages.length) {
                        const languages = savedLanguages.length === 1 ? savedLanguages[0] : `(${savedLanguages.join(', ')})`;
                        logger.verbose(`Successfully wrote translations to ${languagesDirectory}/${languages}/${fileName}`);
                    }
                },
                getMissingTranslations(): TranslateNamespaceMissingTranslations | undefined {
                    function walk(
                        baseTranslations: TranslateNamespace['baseLanguageTranslations'],
                        targetLanguagesTranslations: TranslateNamespace['targetLanguages']
                    ): TranslateNamespaceMissingTranslations | undefined {

                        const x: TranslateNamespaceMissingTranslations = {
                            baseLanguageTranslations: {},
                            targetLanguageTranslationsKeys: {}
                        }

                        function getTargetContainer(languageCode: string): any {
                            let missingKeys = x.targetLanguageTranslationsKeys[languageCode];
                            if (!missingKeys) {
                                missingKeys = {}
                                x.targetLanguageTranslationsKeys[languageCode] = missingKeys;
                            }
                            return missingKeys;
                        }

                        for (const [key, value] of Object.entries(baseTranslations)) {
                            if (typeof value === "object") {
                                // Dig target languages
                                const targetDig: TranslateNamespace['targetLanguages'] = []
                                for (let {translations, ...rest} of targetLanguagesTranslations) {
                                    targetDig.push({
                                        translations: translations[key] || {},
                                        ...rest
                                    })
                                }

                                const result = walk(value, targetDig);
                                if (result) {
                                    x.baseLanguageTranslations[key] = result.baseLanguageTranslations;
                                    for (let languageCode in result.targetLanguageTranslationsKeys) {
                                        getTargetContainer(languageCode)[key] = result.targetLanguageTranslationsKeys[languageCode];
                                    }
                                }
                                continue;
                            }

                            let foundMissed = false;
                            for (let languageContainer of targetLanguagesTranslations) {
                                if (!languageContainer.translations[key]) {
                                    foundMissed = true;
                                    // Empty string, we need it just to create schema
                                    getTargetContainer(languageContainer.languageCode)[key] = '';
                                }
                            }

                            if (!foundMissed) {
                                continue;
                            }

                            x.baseLanguageTranslations[key] = value;
                        }

                        if (Object.keys(x.baseLanguageTranslations).length === 0) return undefined;
                        return x;
                    }

                    return walk(this.baseLanguageTranslations, this.targetLanguages);
                }
            })
        } catch (error) {
            logger.error(`Error reading "${baseLanguageDirectory}/${fileName}":`, error);
            throw error;
        }
    }

    for (let namespace of namespaces) {
        try {
            validateTranslationStructure(namespace.baseLanguageTranslations)
        } catch (error: any) {
            logger.error(`Translation namespace "${baseLanguageDirectory}/${namespace.jsonFileName}" not valid:`, error);
            throw error;
        }
    }

    for (let targetLanguageCode of options.targetLanguageCodes) {
        const targetLanguageDirectory = path.resolve(languagesDirectory, formatLanguageContainerDirectoryName(targetLanguageCode, options));

        try {
            await fs.access(targetLanguageDirectory);
        } catch {
            logger.verbose(`Creating directory for target language: ${targetLanguageCode}`);
            await fs.mkdir(targetLanguageDirectory, {recursive: true});
        }

        for (const namespace of namespaces) {
            try {
                const filePath = path.join(targetLanguageDirectory, namespace.jsonFileName);
                let content: any;

                let contentString: string = '{}';
                try {
                    contentString = await fs.readFile(filePath, 'utf-8');
                } catch {
                    logger.warn(`"${targetLanguageCode}/${namespace.jsonFileName}" not found. Initializing empty JSON.`);
                }

                try {
                    content = JSON.parse(contentString);
                } catch (error) {
                    logger.warn(`"${targetLanguageCode}/${namespace.jsonFileName}" invalid JSON.`);
                    // noinspection ExceptionCaughtLocallyJS
                    throw error;
                }

                namespace.targetLanguages.push({
                    dirty: false,
                    languageCode: targetLanguageCode,
                    translations: cleanTargetTranslations(namespace.baseLanguageTranslations, content),
                })
            } catch (error) {
                logger.error(`Error reading "${targetLanguageCode}/${namespace.jsonFileName}":`, error);
                throw error;
            }
        }
    }

    return namespaces;
}

export function applyEngineTranslations(namespace: TranslateNamespace, engineTranslations: TranslateEngineTranslateResult): void {
    for (let languageCode of Object.keys(engineTranslations)) {
        const targetLanguage = namespace.targetLanguages.find(lang => lang.languageCode === languageCode)!;
        mergeObjects(targetLanguage.translations, engineTranslations[languageCode])
        targetLanguage.dirty = true;
    }
}

function mergeObjects(target: Record<string, any>, source: Record<string, any>): void {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (target[key] && typeof target[key] === 'object' && typeof source[key] === 'object') {
                mergeObjects(target[key] || {}, source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
}