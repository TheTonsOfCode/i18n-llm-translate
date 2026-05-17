import { TranslateEngineEstimateEngine } from "$/type";
import { AbstractTokenCostEstimateEngine, TokenPricing } from "$/engines/estimate/abstract";

interface OpenRouterPricing {
    prompt?: string;
    completion?: string;
}

interface OpenRouterModel {
    id: string;
    pricing?: OpenRouterPricing;
}

interface OpenRouterModelsResponse {
    data?: OpenRouterModel[];
}

export interface OpenRouterCostEstimateEngineConfig {
    provider: string;
    model: string;
    apiUrl?: string;
}

const OPENROUTER_MODELS_API_URL = 'https://openrouter.ai/api/v1/models';

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function toNumber(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function findOpenRouterModel(models: OpenRouterModel[], provider: string, model: string): OpenRouterModel | undefined {
    const normalizedProvider = provider.toLowerCase();
    const fullModelId = model.includes('/') ? model : `${normalizedProvider}/${model}`;

    return models.find(m => m.id === fullModelId)
        ?? models.find(m => m.id.toLowerCase() === fullModelId.toLowerCase());
}

class OpenRouterCostEstimateEngine extends AbstractTokenCostEstimateEngine {
    constructor(private readonly config: OpenRouterCostEstimateEngineConfig) {
        super(`OpenRouter (${config.provider}/${config.model})`);
    }

    protected async loadPricing(): Promise<TokenPricing | undefined> {
        const response = await fetch(this.config.apiUrl || OPENROUTER_MODELS_API_URL);
        if (!response.ok) {
            return this.setPricingUnavailable(`Failed to fetch pricing from OpenRouter: HTTP ${response.status}`);
        }

        const data = await response.json() as OpenRouterModelsResponse;
        const model = findOpenRouterModel(data.data || [], this.config.provider, this.config.model);
        const inputCostPerToken = toNumber(model?.pricing?.prompt);
        const outputCostPerToken = toNumber(model?.pricing?.completion);

        if (inputCostPerToken === undefined || outputCostPerToken === undefined) {
            return this.setPricingUnavailable(
                `Failed to fetch pricing from OpenRouter for model "${this.config.provider}/${this.config.model}"`
            );
        }

        return { inputCostPerToken, outputCostPerToken };
    }

    protected formatInitializationError(error: unknown): string {
        return `Failed to fetch pricing from OpenRouter: ${errorMessage(error)}`;
    }
}

export function createOpenRouterCostEstimateEngine(config: OpenRouterCostEstimateEngineConfig): TranslateEngineEstimateEngine {
    return new OpenRouterCostEstimateEngine(config);
}
