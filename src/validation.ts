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

/**
 * Extracts all variable names from a string that match the pattern {{ variableName }}
 * @param str The string to extract variables from
 * @returns Array of variable names found in the string
 */
export function extractVariablesFromString(str: string): string[] {
    const variableRegex = /\{\{\s*(\w+)\s*\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(str)) !== null) {
        variables.push(match[1]);
    }
    
    return variables;
}

/**
 * Creates a zod schema that validates a string contains the same variables as the original
 * @param originalString The original string to compare against
 * @returns A zod schema that validates variable consistency
 */
export function createVariableConsistencySchema(originalString: string) {
    const originalVariables = extractVariablesFromString(originalString);
    
    return z.string().superRefine((translatedString, ctx) => {
        const translatedVariables = extractVariablesFromString(translatedString);
        
        // Check if all original variables are present in the translated string
        const allOriginalPresent = originalVariables.every(variable => 
            translatedVariables.includes(variable)
        );
        
        // Check if all translated variables were present in the original
        const allTranslatedPresent = translatedVariables.every(variable => 
            originalVariables.includes(variable)
        );
        
        if (!allOriginalPresent || !allTranslatedPresent) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Variable mismatch. Original variables: [${originalVariables.join(', ')}], Translated variables: [${translatedVariables.join(', ')}]`
            });
        }
    });
}

/**
 * Creates a zod schema for an object that validates all string values maintain variable consistency
 * @param originalObject The original object to compare against
 * @returns A zod schema that validates variable consistency for all string values
 */
export function createObjectVariableConsistencySchema(originalObject: Record<string, any>): z.ZodObject<any> {
    const schema: any = {};
    
    for (const [key, value] of Object.entries(originalObject)) {
        if (typeof value === "string") {
            schema[key] = createVariableConsistencySchema(value);
        } else if (typeof value === "object" && value !== null) {
            schema[key] = createObjectVariableConsistencySchema(value);
        } else {
            schema[key] = z.any();
        }
    }
    
    return z.object(schema);
}

export function generateLanguagesTranslateReturnZodSchema(targetLanguages: string[], differencesSchema: z.ZodObject<any>): z.ZodObject<any> {
    const object: any = {};
    for (let targetLanguage of targetLanguages) {
        object[targetLanguage] = differencesSchema;
    }
    return z.object(object);
}

export function generateTranslationsZodSchema(obj: Record<string, any>): z.ZodObject<any> {
    const object: any = {};
    for (let [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
            object[key] = createVariableConsistencySchema(value);
        } else if (typeof value === "object" && value !== null) {
            object[key] = generateTranslationsZodSchema(value);
        } else {
            throw new Error(`Invalid type for key '${key}': Expected string or object.`);
        }
    }
    return z.object(object);
}