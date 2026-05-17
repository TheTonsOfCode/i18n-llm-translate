import { describe, it, expect, vi, afterEach } from 'vitest'
import { createOpenRouterCostEstimateEngine } from '$/engines/estimate'

describe('OpenRouter cost estimate engine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should estimate token cost from OpenRouter pricing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'openai/gpt-4o-mini',
            pricing: {
              prompt: '0.00000015',
              completion: '0.0000006'
            }
          }
        ]
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const estimateEngine = createOpenRouterCostEstimateEngine({
      provider: 'openai',
      model: 'gpt-4o-mini'
    })

    await estimateEngine.initialize()

    const estimate = estimateEngine.estimateTokenCost({
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500
    })

    expect(fetchMock).toHaveBeenCalledWith('https://openrouter.ai/api/v1/models')
    expect(estimate.pricingAvailable).toBe(true)
    expect(estimate.inputCost).toBeCloseTo(0.00015)
    expect(estimate.outputCost).toBeCloseTo(0.0003)
    expect(estimate.totalCost).toBeCloseTo(0.00045)
  })

  it('should return zero cost when OpenRouter pricing cannot be fetched', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    })
    vi.stubGlobal('fetch', fetchMock)

    const estimateEngine = createOpenRouterCostEstimateEngine({
      provider: 'openai',
      model: 'gpt-4o-mini'
    })

    await estimateEngine.initialize()

    const estimate = estimateEngine.estimateTokenCost({
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500
    })

    expect(estimate.pricingAvailable).toBe(false)
    expect(estimate.totalCost).toBe(0)
    expect(estimate.message).toContain('Failed to fetch pricing from OpenRouter')
  })
})
