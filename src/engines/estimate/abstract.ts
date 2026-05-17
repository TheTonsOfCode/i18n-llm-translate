import {
    TranslateEngineCostEstimate,
    TranslateEngineEstimateEngine,
    TranslateEngineUsageStats
} from "$/type";

export interface TokenPricing {
    inputCostPerToken: number;
    outputCostPerToken: number;
}

export abstract class AbstractTokenCostEstimateEngine implements TranslateEngineEstimateEngine {
    private pricing: TokenPricing | undefined;
    private initialized = false;
    private initializationMessage: string | undefined;

    protected constructor(private readonly source: string) {}

    async initialize(): Promise<void> {
        this.initialized = true;
        this.initializationMessage = undefined;
        this.pricing = undefined;

        try {
            this.pricing = await this.loadPricing();
        } catch (error) {
            this.initializationMessage = this.formatInitializationError(error);
        }
    }

    estimateTokenCost(usageStats: TranslateEngineUsageStats): TranslateEngineCostEstimate {
        if (!this.initialized) {
            return this.zeroCostEstimate(usageStats, 'Pricing estimate engine was not initialized');
        }

        if (!this.pricing) {
            return this.zeroCostEstimate(usageStats, this.initializationMessage);
        }

        const inputTokens = usageStats.inputTokens || 0;
        const outputTokens = usageStats.outputTokens || 0;
        const totalTokens = usageStats.totalTokens || inputTokens + outputTokens;
        const inputCost = inputTokens * this.pricing.inputCostPerToken;
        const outputCost = outputTokens * this.pricing.outputCostPerToken;

        return {
            currency: 'USD',
            inputTokens,
            outputTokens,
            totalTokens,
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
            inputCostPerToken: this.pricing.inputCostPerToken,
            outputCostPerToken: this.pricing.outputCostPerToken,
            source: this.source,
            pricingAvailable: true
        };
    }

    protected abstract loadPricing(): Promise<TokenPricing | undefined>;

    protected abstract formatInitializationError(error: unknown): string;

    protected setPricingUnavailable(message: string): undefined {
        this.initializationMessage = message;
        return undefined;
    }

    private zeroCostEstimate(
        usageStats: TranslateEngineUsageStats,
        message?: string
    ): TranslateEngineCostEstimate {
        return {
            currency: 'USD',
            inputTokens: usageStats.inputTokens || 0,
            outputTokens: usageStats.outputTokens || 0,
            totalTokens: usageStats.totalTokens || 0,
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            inputCostPerToken: 0,
            outputCostPerToken: 0,
            source: this.source,
            pricingAvailable: false,
            message
        };
    }
}
