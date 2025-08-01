import { TranslateNamespace, TranslateOptions } from "$/type";
import { formatLanguageContainerDirectoryName } from "$/util";
import { defaultLogger } from "$/logger";
import path from "path";
import { promises as fs } from 'fs';

export async function cleanLanguagesDirectory(options: TranslateOptions): Promise<boolean> {
    const logger = options.logger || defaultLogger;
    const languagesDirectory = path.resolve(process.env.PWD!, options.languagesDirectoryPath);
    const validEntries = new Set([
        ...options.targetLanguageCodes.map(language => formatLanguageContainerDirectoryName(language, options)),
        formatLanguageContainerDirectoryName(options.baseLanguageCode, options),
        options.namesMapping!.jsonCache!
    ]);

    let dirty = false;

    try {
        const entries = await fs.readdir(languagesDirectory, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(languagesDirectory, entry.name);

            if (!validEntries.has(entry.name)) {
                try {
                    if (entry.isDirectory()) {
                        await fs.rmdir(entryPath, { recursive: true });
                    } else {
                        await fs.unlink(entryPath);
                    }
                    dirty = true;
                    logger.verbose(`Removed invalid entry: ${entryPath}`);
                } catch (error) {
                    logger.error(`Error removing ${entryPath}:`, error);
                }
            }
        }
    } catch (error) {
        logger.error(`Error cleaning languages directory:`, error);
    }

    return dirty;
}

export async function cleanNamespaces(options: TranslateOptions, namespaces: TranslateNamespace[]): Promise<void> {
    const logger = options.logger || defaultLogger;
    const languagesDirectory = path.resolve(
        process.env.PWD!,
        options.languagesDirectoryPath
    );

    const validFiles = new Set(
        namespaces.map(namespace => namespace.jsonFileName)
    );

    for (const targetLanguageCode of options.targetLanguageCodes) {
        const targetLanguageDirectory = path.join(languagesDirectory, formatLanguageContainerDirectoryName(targetLanguageCode, options));

        try {
            const entries = await fs.readdir(targetLanguageDirectory, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(targetLanguageDirectory, entry.name);

                if (!validFiles.has(entry.name)) {
                    try {
                        if (entry.isDirectory()) {
                            await fs.rmdir(entryPath, { recursive: true });
                            logger.verbose(`Removed invalid directory: ${entryPath}`);
                        } else {
                            await fs.unlink(entryPath);
                            logger.verbose(`Removed invalid file: ${entryPath}`);
                        }
                    } catch (error) {
                        logger.error(`Error removing ${entryPath}:`, error);
                    }
                }
            }
        } catch (error) {
            logger.error(`Error reading directory for language '${targetLanguageCode}':`, error);
        }
    }
}

