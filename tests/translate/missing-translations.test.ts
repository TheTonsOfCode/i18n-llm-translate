import { describe, it, expect, beforeEach, vi } from 'vitest'
import { translate } from '$/index'
import { TranslateOptions } from '$/type'
import { createMockLogger } from "../mock"
import { mockEngine, createMockNamespace, createMockCache, setupTestEnvironment } from './shared-mocks'

// Mock dependencies at module level
vi.mock('$/cache')
vi.mock('$/cleaner')
vi.mock('$/namespace')
vi.mock('$/util')
vi.mock('$/engines/cache')

describe('Missing Translations', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  it('should process missing translations from cache', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace = createMockNamespace('test.json', false, true)
    const mockCache = createMockCache()
    const mockCacheEngine = {
      translateMissed: vi.fn().mockResolvedValue({ pl: { missing: 'Missing PL' }, de: { missing: null } })
    }
    
    const { readTranslationsNamespaces, applyEngineTranslations } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    const { clearNullsFromResult, countTranslatedKeys } = await import('$/util')
    const { createCacheTranslateEngine } = await import('$/engines/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    vi.mocked(createCacheTranslateEngine).mockReturnValue(mockCacheEngine as any)
    vi.mocked(clearNullsFromResult).mockReturnValue({ pl: { missing: 'Missing PL' } })
    vi.mocked(countTranslatedKeys).mockReturnValue(1)

    await translate(mockEngine, options)

    expect(mockCacheEngine.translateMissed).toHaveBeenCalled()
    expect(clearNullsFromResult).toHaveBeenCalledWith({ pl: { missing: 'Missing PL' }, de: { missing: null } })
    expect(countTranslatedKeys).toHaveBeenCalledWith({ pl: { missing: 'Missing PL' } })
    expect(applyEngineTranslations).toHaveBeenCalledWith(mockNamespace, { pl: { missing: 'Missing PL' } })
  })

  it('should process remaining missing translations with engine', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace = createMockNamespace('test.json', false, true)
    // Mock getMissingTranslations to return missing translations twice (before and after cache)
    mockNamespace.getMissingTranslations = vi.fn()
      .mockReturnValueOnce({
        baseLanguageTranslations: { missing: 'Missing' },
        targetLanguageTranslationsKeys: { pl: { missing: '' }, de: { missing: '' } }
      })
      .mockReturnValueOnce({
        baseLanguageTranslations: { stillMissing: 'Still Missing' },
        targetLanguageTranslationsKeys: { pl: { stillMissing: '' } }
      })

    const mockCache = createMockCache()
    const mockCacheEngine = {
      translateMissed: vi.fn().mockResolvedValue({})
    }
    
    const { readTranslationsNamespaces, applyEngineTranslations } = await import('$/namespace')
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

    expect(mockEngine.translateMissed).toHaveBeenCalled()
    expect(applyEngineTranslations).toHaveBeenCalledTimes(2) // Once for cache, once for engine
  })
}) 