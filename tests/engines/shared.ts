import {TranslateEngine} from "$/type";
import {createDummyTranslateEngine} from "$/engines/dummy";
import {createDeepLTranslateEngine} from "$/engines/ml/deepl";
import {createGoogleTranslateEngine} from "$/engines/ml/google_";
import {createOpenAITranslateEngine} from "$/engines/llm/openai";
import {createClaudeTranslateEngine} from "$/engines/llm/claude";

const EngineKeys = ['dummy', 'openai', 'openai-4o', 'deepl', 'google', 'claude'] as const;
type EngineKey = typeof EngineKeys[number];

let MOCK_ENGINES: TranslateEngine[] | undefined = undefined;

export function getMockEngines(): TranslateEngine[] {
    if (MOCK_ENGINES) {
        return MOCK_ENGINES;
    }

    const enginesNames: EngineKey[] = (process.env?.TEST_ENGINES?.split(',') || ['dummy']) as unknown as EngineKey[];

    for (let engineName of enginesNames) {
        // @ts-ignore
        if (!EngineKeys.includes(engineName)) {
            throw new Error(`Translate engine "${engineName}" not found.`);
        }
    }

    function enabled(key: EngineKey) {
        return enginesNames.includes(key) || enginesNames.includes('*' as EngineKey);
    }

    const engines: TranslateEngine[] = [];

    if (enabled('deepl')) {
        engines.push(createDeepLTranslateEngine({
            apiKey: process.env.DEEPL_API_KEY!
        }));
    }

    if (enabled('openai')) {
        engines.push(createOpenAITranslateEngine({
            apiKey: process.env.OPENAI_API_KEY!
        }));
    }

    if (enabled('openai-4o')) {
        engines.push(createOpenAITranslateEngine({
            apiKey: process.env.OPENAI_API_KEY!,
            model: 'gpt-4o-2024-08-06'
        }));
    }

    if (enabled('claude')) {
        engines.push(createClaudeTranslateEngine({
            apiKey: process.env.CLAUDE_API_KEY!
        }));
    }

    if (enabled('google')) {
        engines.push(createGoogleTranslateEngine({
            apiKey: process.env.GOOGLE_API_KEY!
        }));
    }

    if (enabled('dummy')) {
        engines.push(createDummyTranslateEngine());
    }

    if (!engines.length) {
        throw new Error(`No engines found`);
    }

    MOCK_ENGINES = engines;

    return engines;
}

