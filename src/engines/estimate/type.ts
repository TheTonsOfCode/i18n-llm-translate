export interface EstimateCharactersUsage {
    charactersCount: number;
}

export interface EstimateTokenUsage {
    inputTokens: number;
    outputTokens: number;
}

export type EstimateUsage = EstimateCharactersUsage | EstimateTokenUsage;

export interface EstimatePriceResult {
    available: boolean;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
    formatted: string;
    message?: string;
}

export interface EstimateEngineInitializeResult {
    ok: boolean;
    message?: string;
}

export interface EstimateEngine {
    name: string;

    initialize(): Promise<EstimateEngineInitializeResult>;

    estimatePrice(usage: EstimateUsage): EstimatePriceResult;
}
