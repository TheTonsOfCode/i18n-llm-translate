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

describe('Cache Management', () => {
  beforeEach(() => {
    setupTestEnvironment()
  })

  it('should write cache and namespaces when dirty', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace = createMockNamespace('test.json', true)
    const mockCache = {
      cache: {},
      cleanCache: vi.fn().mockReturnValue(false),
      syncCacheWithNamespaces: vi.fn(),
      write: vi.fn().mockResolvedValue(undefined),
      getBaseLanguageTranslationDifferences: vi.fn().mockReturnValue({ test: 'Test' })
    }
    
    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    const mockLogger = createMockLogger()
    
    options.logger = mockLogger
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)

    mockEngine.translate.mockResolvedValue({ pl: { test: 'Test PL' }, de: { test: 'Test DE' } })

    await translate(mockEngine, options)

    expect(mockCache.syncCacheWithNamespaces).toHaveBeenCalledWith([mockNamespace], true)
    expect(mockCache.write).toHaveBeenCalled()
    expect(mockNamespace.write).toHaveBeenCalled()
    expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('Translated and saved successfully'))
  })

  it('should write cache when dirtyCache is true', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace = createMockNamespace('test.json')
    const mockCache = createMockCache(true, false)
    
    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    const mockLogger = createMockLogger()
    
    options.logger = mockLogger
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)

    await translate(mockEngine, options)

    expect(mockCache.write).toHaveBeenCalled()
    expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('No changes detected'))
  })

  it('should log no changes when not dirty', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace = createMockNamespace('test.json')
    const mockCache = createMockCache(false, false)
    
    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    const mockLogger = createMockLogger()
    
    options.logger = mockLogger
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)

    await translate(mockEngine, options)

    expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('No changes detected'))
  })

  it('should log cache loaded count when greater than 0', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace = createMockNamespace('test.json', false, false)
    // Mock getMissingTranslations to return missing translations first time, then undefined
    mockNamespace.getMissingTranslations = vi.fn()
      .mockReturnValueOnce({
        baseLanguageTranslations: { missing: 'Missing' },
        targetLanguageTranslationsKeys: { pl: { missing: '' }, de: { missing: '' } }
      })
      .mockReturnValueOnce(undefined) // Second call returns undefined so no engine translation happens

    const mockCache = createMockCache()
    const mockCacheEngine = {
      translateMissed: vi.fn().mockResolvedValue({ pl: { missing: 'Missing PL' } })
    }
    
    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    const { clearNullsFromResult, countTranslatedKeys } = await import('$/util')
    const { createCacheTranslateEngine } = await import('$/engines/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    vi.mocked(createCacheTranslateEngine).mockReturnValue(mockCacheEngine as any)
    vi.mocked(clearNullsFromResult).mockReturnValue({ pl: { missing: 'Missing PL' } })
    vi.mocked(countTranslatedKeys).mockReturnValue(5)

    await translate(mockEngine, options)

    // The logger should be called with the cache count message
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Total translations loaded from cache: 5')
    )
  })
}) 