import {
    TranslateEngine,
    TranslateEngineTranslateResult,
    TranslateNamespaceMissingTranslations,
    TranslateOptions
} from "$/type";
import {defaultLogger} from "$/logger";

const ABSOLUTE_CONTEXT: string[] = [
    'You have to output JSON and only JSON.',
    'Keep all variable names and JSON structure exactly the same, only translate the values.',
];

// Sonnet - Slower, more accurate, more expensive [$3/MTok (input), $15/MTok (output)]
// Haiku - Faster, less accurate, cheaper [$0.80/MTok (input), $4/MTok (output)]
type ClaudeModel =
    | 'claude-3-7-sonnet-20250219'
    | 'claude-3-5-sonnet-20241022'
    | 'claude-3-5-haiku-20241022'
    | 'claude-3-5-sonnet-20240620'
    | 'claude-3-opus-20240229'
    | 'claude-3-haiku-20240307';

const DEFAULT_MODEL: ClaudeModel = 'claude-3-7-sonnet-20250219';
// const DEFAULT_MODEL: ClaudeModel = 'claude-3-5-haiku-20241022';

const ClaudeModelMaxTokens: Record<ClaudeModel, number> = {
    'claude-3-7-sonnet-20250219': 64000, //128000, <- for that extended thinking is needed
    'claude-3-5-sonnet-20241022': 8192,
    'claude-3-5-haiku-20241022': 8192,
    'claude-3-5-sonnet-20240620': 8192,
    'claude-3-opus-20240229': 4096,
    'claude-3-haiku-20240307': 4096
} as const;

export interface OpenAIConfig {
    apiKey: string;

    model?: ClaudeModel | (string & {});
}

export function createClaudeTranslateEngine(config: OpenAIConfig): TranslateEngine {
    if (!config.apiKey) {
        throw new Error('Claude > Missing apiKey');
    }

    const model = config.model || DEFAULT_MODEL;

    interface ClaudeResponse {
        data: Record<string, any>;
        input_tokens: number;
        output_tokens: number;
    }

    async function fetchAnthropic(context: string): Promise<ClaudeResponse> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model,
                max_tokens: ClaudeModelMaxTokens[model as ClaudeModel] || 1024,
                messages: [
                    {
                        role: "user",
                        content: context
                    },
                    {
                        role: "assistant",
                        // https://github.com/anthropics/anthropic-cookbook/blob/main/misc/how_to_enable_json_mode.ipynb
                        content: "[JSON Translator]: {"
                    },
                ]
            })
        });

        const data = await response.json();

        if ('error' in data) {
            throw new Error(`${data.error.type}: ${data.error.message}`);
        }

        let translations;

        try {
            // Not elegant solution, but working for something like:
            // At the beginning of output> Here is the JSON requested: Fixed by: // https://github.com/anthropics/anthropic-cookbook/blob/main/misc/how_to_enable_json_mode.ipynb
            // At the end> Note: I've kept the entire JSON structure
            const potentialJSON = extractBracedContent('{' + data.content[0].text);
            translations = JSON.parse(potentialJSON!);
        } catch (e) {
            // This error logging should always be visible as it's a critical error
            console.error('----------');
            console.error('Error while parsing translations to json!');
            console.error('Context:\n\n', context, '\n\n');
            console.error('Claude response data:\n\n', data);
            console.error('----------');
            throw e;
        }

        return {
            data: translations,
            input_tokens: data.usage.input_tokens,
            output_tokens: data.usage.output_tokens,
        };
    }

    return {
        name: `Claude (${model})`,

        async translate(
            translations: Record<string, any>,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            const languagesTranslations: any = {}

            const logger = options.logger || defaultLogger;
            let input_tokens = 0;
            let output_tokens = 0;
            for (let targetLanguageCode of options.targetLanguageCodes) {

                const context = [
                    `Translate this JSON from language code ${options.baseLanguageCode} to ${targetLanguageCode}.`,

                    ...ABSOLUTE_CONTEXT,

                    ...options.applicationContextEntries,

                    `Maintain professional terminology and context: ${JSON.stringify(translations)}`
                ].join(' ');

                logger.engineDebug('Claude', `Fetching translations for language "${targetLanguageCode}"`);

                const {data, ...consumption} = await fetchAnthropic(context);

                languagesTranslations[targetLanguageCode] = data;
                input_tokens += consumption.input_tokens;
                output_tokens += consumption.output_tokens;

                logger.engineVerbose('Claude', `Fetched translations which consumed: ${JSON.stringify(consumption)}`);
            }
            if (options.targetLanguageCodes.length > 1) {
                logger.engineVerbose('Claude', `Consumed in total: ${JSON.stringify({input_tokens, output_tokens})}`);
            }

            return languagesTranslations;
        },

        async translateMissed(
            missingTranslations: TranslateNamespaceMissingTranslations,
            options: TranslateOptions
        ): Promise<TranslateEngineTranslateResult> {

            const context = [
                ...ABSOLUTE_CONTEXT,

                ...options.applicationContextEntries,

                `Here is a translation dictionary from the language with the code "${options.baseLanguageCode}": ${missingTranslations.baseLanguageTranslations}.`,
                'Next, a structure that needs to be completed will be provided.',
                'The first keys in it are language codes,',
                'and all translations nested under them should be in their respective languages.',

                'Maintain professional terminology and context',
                `Translate fully next object: ${JSON.stringify(missingTranslations.targetLanguageTranslationsKeys)}`
            ].join(' ');

            const logger = options.logger || defaultLogger;
            logger.engineDebug('Claude', `Fetching missing translations`);

            const {data, ...consumption} = await fetchAnthropic(context);

            logger.engineVerbose('Claude', `Response data: ${JSON.stringify(data, null, 2)}`);
            logger.engineVerbose('Claude', `Fetched translations which consumed: ${JSON.stringify(consumption)}`);

            return data;
        }
    }
}

function extractBracedContent(input: string): string | null {
    const firstIndex = input.indexOf('{');
    const lastIndex = input.lastIndexOf('}');

    if (firstIndex === -1 || lastIndex === -1 || firstIndex > lastIndex) {
        return null;
    }

    return input.substring(firstIndex, lastIndex + 1);
}

/*
const countTokens = async (text: string) => {
    const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
        method: 'POST',
        headers: {
            'x-api-key': CLAUDE_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: "claude-3-7-sonnet-20250219",
            messages: [
                {role: "user", content: text}
            ]
        })
    });

    const data = await response.json();
    console.log(data);
    return data.input_tokens;
}*/