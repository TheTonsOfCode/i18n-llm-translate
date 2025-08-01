import { describe, it, expect, beforeEach, vi } from 'vitest'
import { translate } from '$/translate'
import { TranslateOptions } from '$/type'
import { createMockLogger } from "../mock"
import { mockEngine, createMockNamespace, createMockCache, setupTestEnvironment } from './shared-mocks'

// Mock dependencies at module level
vi.mock('$/cache')
vi.mock('$/cleaner')
vi.mock('$/namespace')
vi.mock('$/util')
vi.mock('$/engines/cache')

describe('Logging and Debug', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  it('should handle debug mode for missed translations', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context'],
      debug: true
    }

    const mockNamespace = createMockNamespace('test.json', false, true)
    mockNamespace.getMissingTranslations = vi.fn()
      .mockReturnValueOnce({
        baseLanguageTranslations: { missing: 'Missing' },
        targetLanguageTranslationsKeys: { pl: { missing: '' } }
      })
      .mockReturnValueOnce({
        baseLanguageTranslations: { stillMissing: 'Still Missing' },
        targetLanguageTranslationsKeys: { pl: { stillMissing: '' } }
      })

    const mockCache = createMockCache()
    const mockCacheEngine = {
      translateMissed: vi.fn().mockResolvedValue({})
    }
    
    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    const { clearNullsFromResult, countTranslatedKeys } = await import('$/util')
    const { createCacheTranslateEngine } = await import('$/engines/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    vi.mocked(createCacheTranslateEngine).mockReturnValue(mockCacheEngine as any)
    vi.mocked(clearNullsFromResult).mockReturnValue({})
    vi.mocked(countTranslatedKeys).mockReturnValue(0)

    mockEngine.translateMissed.mockResolvedValue({ pl: { stillMissing: 'Still Missing PL' } })

    await translate(mockEngine, options)

    // The logger should be called with debug message about missed translations
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Missed translations structure prepared')
    )
  })
}) 