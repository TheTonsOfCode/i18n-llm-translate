import {TranslateNamespace, TranslateOptions} from "$/type";
import {formatLanguageContainerDirectoryName} from "$/util";
import path from "path";
import {promises as fs} from 'fs';

export async function cleanLanguagesDirectory(options: TranslateOptions): Promise<void> {
    const languagesDirectory = path.resolve(process.env.PWD!, options.languagesDirectoryPath);
    const validEntries = new Set([
        ...options.targetLanguageCodes.map(language => formatLanguageContainerDirectoryName(language, options)),
        formatLanguageContainerDirectoryName(options.baseLanguageCode, options),
        options.namesMapping!.jsonCache!
    ]);

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
                    console.log(`Translation# Removed invalid entry: ${entryPath}`);
                } catch (error) {
                    console.error(`Translation# Error removing ${entryPath}:`, error);
                }
            }
        }
    } catch (error) {
        console.error(`Translation# Error cleaning languages directory:`, error);
    }
}

export async function cleanNamespaces(options: TranslateOptions, namespaces: TranslateNamespace[]): Promise<void> {
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
                            console.log(`Translation# Removed invalid directory: ${entryPath}`);
                        } else {
                            await fs.unlink(entryPath);
                            console.log(`Translation# Removed invalid file: ${entryPath}`);
                        }
                    } catch (error) {
                        console.error(`Translation# Error removing ${entryPath}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error(`Translation# Error reading directory for language '${targetLanguageCode}':`, error);
        }
    }
}

