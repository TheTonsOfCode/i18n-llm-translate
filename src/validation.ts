import { z } from "zod";
import { TranslateOptions } from "$/type";

const TranslateOptionsSchema = z.object({
    languagesDirectoryPath: z.string().min(1, "languagesDirectoryPath is required and cannot be empty"),
    baseLanguageCode: z.string().min(1, "baseLanguageCode is required and cannot be empty"),
    targetLanguageCodes: z.array(z.string().min(1)).min(1, "At least one target language code is required"),
    namesMapping: z.object({
        languages: z.union([
            z.function(),
            z.object({
                base: z.string().optional(),
                targets: z.string().optional()
            })
        ]).optional(),
        jsonCache: z.string().optional()
    }).optional(),
    applicationContextEntries: z.array(z.string()),
    cleanup: z.boolean().optional(),
    debug: z.boolean().optional(),
    verbose: z.boolean().optional(),
    logger: z.any().optional()
});

export function validateTranslateOptions(options: TranslateOptions): void {
    try {
        TranslateOptionsSchema.parse(options);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(err => 
                `${err.path.join('.')}: ${err.message}`
            ).join('; ');
            throw new Error(`Configuration validation failed: ${errorMessages}`);
        }
        throw error;
    }
}