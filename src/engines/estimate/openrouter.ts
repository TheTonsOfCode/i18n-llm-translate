import {
    EstimateEngine,
    EstimateEngineInitializeResult,
    EstimatePriceResult,
    EstimateUsage
} from "$/engines/estimate/type";

interface OpenRouterModel {
    id: string;
    pricing?: {
        prompt?: string;
        completion?: string;
    };
}

interface OpenRouterModelsResponse {
    data?: OpenRouterModel[];
}

export interface OpenRouterEstimateConfig {
    provider: 'openai' | (string & {});
    model: string;
}

export function createOpenRouterEstimateEngine(config: OpenRouterEstimateConfig): EstimateEngine {
    const modelId = toOpenRouterModelId(config.provider, config.model);
    let inputCostPerToken = 0;
    let outputCostPerToken = 0;
    let initialized = false;
    let fetchError: string | undefined;

    return {
        name: `OpenRouter (${modelId})`,

        async initialize(): Promise<EstimateEngineInitializeResult> {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/models');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json() as OpenRouterModelsResponse;
                const model = data.data?.find(item => item.id === modelId);

                if (!model) {
                    throw new Error(`Model "${modelId}" not found`);
                }

                inputCostPerToken = Number(model.pricing?.prompt || 0);
                outputCostPerToken = Number(model.pricing?.completion || 0);
                initialized = true;
                fetchError = undefined;

                return {
                    ok: true,
                    message: `pricing: input ${formatCostPerMillionTokens(inputCostPerToken)}, output ${formatCostPerMillionTokens(outputCostPerToken)}`
                };
            } catch (error) {
                fetchError = error instanceof Error ? error.message : String(error);
                inputCostPerToken = 0;
                outputCostPerToken = 0;
                initialized = false;

                return {
                    ok: false,
                    message: `could not fetch pricing: ${fetchError}`
                };
            }
        },

        estimatePrice(usage: EstimateUsage): EstimatePriceResult {
            if (!('inputTokens' in usage)) {
                return zeroPrice('OpenRouter pricing requires token usage');
            }

            const inputCost = usage.inputTokens * inputCostPerToken;
            const outputCost = usage.outputTokens * outputCostPerToken;
            const totalCost = inputCost + outputCost;

            return {
                available: initialized && !fetchError,
                inputCost,
                outputCost,
                totalCost,
                currency: 'USD',
                formatted: `$${totalCost.toFixed(6)} (input: $${inputCost.toFixed(6)}, output: $${outputCost.toFixed(6)})`,
                message: fetchError
                    ? `OpenRouter pricing was not fetched: ${fetchError}`
                    : initialized ? undefined : 'OpenRouter pricing was not initialized'
            };
        }
    };
}

function toOpenRouterModelId(provider: string, model: string): string {
    if (model.includes('/')) return model;
    return `${provider}/${model}`;
}

function formatCostPerMillionTokens(costPerToken: number): string {
    return `$${(costPerToken * 1_000_000).toFixed(4)}/1M tokens`;
}

function zeroPrice(message: string): EstimatePriceResult {
    return {
        available: false,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        currency: 'USD',
        formatted: '? (input: ?, output: ?)',
        message
    };
}
