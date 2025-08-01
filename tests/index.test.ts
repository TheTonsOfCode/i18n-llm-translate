import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { translate } from '$/index'
import { TranslateEngine, TranslateOptions, TranslateNamespace } from '$/type'

// Mock dependencies
vi.mock('$/cache')
vi.mock('$/cleaner')
vi.mock('$/namespace')
vi.mock('$/util')
vi.mock('$/engines/cache')
vi.mock('zod')

const mockEngine = {
  name: 'test-engine',
  translate: vi.fn().mockResolvedValue({}),
  translateMissed: vi.fn().mockResolvedValue({})
} as TranslateEngine & {
  translate: Mock
  translateMissed: Mock
}

const createMockNamespace = (jsonFileName: string, _hasDifferences = false, hasMissing = false): TranslateNamespace => ({
  jsonFileName,
  baseLanguageTranslations: { test: 'Test' },
  targetLanguages: [
    { dirty: false, languageCode: 'pl', translations: {} },
    { dirty: false, languageCode: 'de', translations: {} }
  ],
  write: vi.fn().mockResolvedValue(undefined),
  getMissingTranslations: vi.fn().mockReturnValue(hasMissing ? {
    baseLanguageTranslations: { missing: 'Missing' },
    targetLanguageTranslationsKeys: { pl: { missing: '' }, de: { missing: '' } }
  } : undefined)
})

const createMockCache = (dirtyCache = false, hasDifferences = false) => ({
  cache: {},
  cleanCache: vi.fn().mockReturnValue(dirtyCache),
  syncCacheWithNamespaces: vi.fn(),
  write: vi.fn().mockResolvedValue(undefined),
  getBaseLanguageTranslationDifferences: vi.fn().mockReturnValue(hasDifferences ? { test: 'Test' } : undefined)
})

describe('translate function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console.log mock
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('should filter out base language from target languages', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['en', 'pl', 'de'],
      applicationContextEntries: ['Test context'],
      cleanup: false
    }

    // Mock required dependencies
    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([])
    vi.mocked(readTranslationsCache).mockResolvedValue({
      cleanCache: vi.fn().mockReturnValue(false),
      syncCacheWithNamespaces: vi.fn(),
      write: vi.fn().mockResolvedValue(undefined)
    } as any)

    await translate(mockEngine, options)
    
    expect(options.targetLanguageCodes).not.toContain('en')
    expect(options.targetLanguageCodes).toEqual(['pl', 'de'])
  })

  it('should set default cache file name', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([])
    vi.mocked(readTranslationsCache).mockResolvedValue({
      cleanCache: vi.fn().mockReturnValue(false),
      syncCacheWithNamespaces: vi.fn(),
      write: vi.fn().mockResolvedValue(undefined)
    } as any)

    await translate(mockEngine, options)

    expect(options.namesMapping?.jsonCache).toBe('.translations-cache.json')
  })

  it('should format application context entries with dots', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context', 'Another context.', 'Third context']
    }

    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([])
    vi.mocked(readTranslationsCache).mockResolvedValue({
      cleanCache: vi.fn().mockReturnValue(false),
      syncCacheWithNamespaces: vi.fn(),
      write: vi.fn().mockResolvedValue(undefined)
    } as any)

    await translate(mockEngine, options)

    expect(options.applicationContextEntries).toEqual([
      'Test context.',
      'Another context.',
      'Third context.'
    ])
  })

  it('should handle engine name correctly', () => {
    expect(mockEngine.name).toBe('test-engine')
    expect(typeof mockEngine.translate).toBe('function')
    expect(typeof mockEngine.translateMissed).toBe('function')
  })

  it('should validate translate options structure', () => {
    const validOptions: TranslateOptions = {
      languagesDirectoryPath: './languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de', 'fr'],
      applicationContextEntries: ['App context'],
      cleanup: true,
      debug: false,
      namesMapping: {
        jsonCache: 'custom-cache.json',
        languages: {
          base: '{language}',
          targets: '{language}'
        }
      }
    }

    expect(validOptions.languagesDirectoryPath).toBe('./languages')
    expect(validOptions.baseLanguageCode).toBe('en')
    expect(validOptions.targetLanguageCodes).toHaveLength(3)
    expect(validOptions.applicationContextEntries).toHaveLength(1)
    expect(validOptions.cleanup).toBe(true)
    expect(validOptions.debug).toBe(false)
    expect(validOptions.namesMapping?.jsonCache).toBe('custom-cache.json')
  })

  it('should call cleanup functions when cleanup option is true', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context'],
      cleanup: true
    }

    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    const { cleanLanguagesDirectory, cleanNamespaces } = await import('$/cleaner')
    
    const mockNamespaces: any[] = []
    vi.mocked(readTranslationsNamespaces).mockResolvedValue(mockNamespaces)
    vi.mocked(readTranslationsCache).mockResolvedValue({
      cleanCache: vi.fn().mockReturnValue(false),
      syncCacheWithNamespaces: vi.fn(),
      write: vi.fn().mockResolvedValue(undefined)
    } as any)

    await translate(mockEngine, options)

    expect(cleanLanguagesDirectory).toHaveBeenCalledWith(options)
    expect(cleanNamespaces).toHaveBeenCalledWith(options, mockNamespaces)
  })

  it('should not call cleanup functions when cleanup option is false', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context'],
      cleanup: false
    }

    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    const { cleanLanguagesDirectory, cleanNamespaces } = await import('$/cleaner')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([])
    vi.mocked(readTranslationsCache).mockResolvedValue({
      cleanCache: vi.fn().mockReturnValue(false),
      syncCacheWithNamespaces: vi.fn(),
      write: vi.fn().mockResolvedValue(undefined)
    } as any)

    await translate(mockEngine, options)

    expect(cleanLanguagesDirectory).not.toHaveBeenCalled()
    expect(cleanNamespaces).not.toHaveBeenCalled()
  })

  it('should handle cache file name without .json extension', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context'],
      namesMapping: {
        jsonCache: 'custom-cache'
      }
    }

    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([])
    vi.mocked(readTranslationsCache).mockResolvedValue(createMockCache())

    await translate(mockEngine, options)

    expect(options.namesMapping?.jsonCache).toBe('custom-cache.json')
  })

  it('should handle cache file name with .json extension', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context'],
      namesMapping: {
        jsonCache: 'custom-cache.json'
      }
    }

    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([])
    vi.mocked(readTranslationsCache).mockResolvedValue(createMockCache())

    await translate(mockEngine, options)

    expect(options.namesMapping?.jsonCache).toBe('custom-cache.json')
  })

  it('should process base differences when they exist', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace = createMockNamespace('test.json')
    const mockCache = createMockCache(false, true)
    
    const { readTranslationsNamespaces, applyEngineTranslations } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    const { z } = await import('zod')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    
    const mockZodObject = {
      safeParse: vi.fn().mockReturnValue({ success: true })
    }
    vi.mocked(z.object).mockReturnValue(mockZodObject as any)
    vi.mocked(z.string).mockReturnValue({} as any)

    mockEngine.translate.mockResolvedValue({ pl: { test: 'Test PL' }, de: { test: 'Test DE' } })

    await translate(mockEngine, options)

    expect(mockEngine.translate).toHaveBeenCalledWith({ test: 'Test' }, options)
    expect(applyEngineTranslations).toHaveBeenCalledWith(mockNamespace, { pl: { test: 'Test PL' }, de: { test: 'Test DE' } })
  })

  it('should handle engine validation failure for base differences', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace = createMockNamespace('test.json')
    const mockCache = createMockCache(false, true)
    
    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    const { z } = await import('zod')
    
    const mockLogger = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      engineLog: vi.fn(),
      engineDebug: vi.fn(),
      engineVerbose: vi.fn(),
      setDebug: vi.fn(),
      setVerbose: vi.fn()
    }
    
    options.logger = mockLogger
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    
    const mockZodObject = {
      safeParse: vi.fn().mockReturnValue({ 
        success: false, 
        error: { issues: ['validation error'] } 
      })
    }
    vi.mocked(z.object).mockReturnValue(mockZodObject as any)
    vi.mocked(z.string).mockReturnValue({} as any)

    mockEngine.translate.mockResolvedValue({ invalid: 'result' })

    await translate(mockEngine, options)

    expect(mockLogger.error).toHaveBeenCalledWith('Engine does not returned proper translation structure!')
    expect(mockLogger.debug).toHaveBeenCalledWith('Base differences:', { test: 'Test' })
    expect(mockLogger.error).toHaveBeenCalledWith('Validation error:', ['validation error'])
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
    const { z } = await import('zod')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    vi.mocked(createCacheTranslateEngine).mockReturnValue(mockCacheEngine as any)
    vi.mocked(clearNullsFromResult).mockReturnValue({})
    vi.mocked(countTranslatedKeys).mockReturnValue(0)
    
    const mockZodObject = {
      safeParse: vi.fn().mockReturnValue({ success: true })
    }
    vi.mocked(z.object).mockReturnValue(mockZodObject as any)
    vi.mocked(z.string).mockReturnValue({} as any)

    mockEngine.translateMissed.mockResolvedValue({ pl: { stillMissing: 'Still Missing PL' } })

    await translate(mockEngine, options)

    expect(mockEngine.translateMissed).toHaveBeenCalled()
    expect(applyEngineTranslations).toHaveBeenCalledTimes(2) // Once for cache, once for engine
  })

  it('should handle engine validation failure for missed translations', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
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
    const { z } = await import('zod')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    const mockLogger = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      engineLog: vi.fn(),
      engineDebug: vi.fn(),
      engineVerbose: vi.fn(),
      setDebug: vi.fn(),
      setVerbose: vi.fn()
    }
    
    options.logger = mockLogger
    
    vi.mocked(createCacheTranslateEngine).mockReturnValue(mockCacheEngine as any)
    vi.mocked(clearNullsFromResult).mockReturnValue({})
    vi.mocked(countTranslatedKeys).mockReturnValue(0)
    
    const mockZodObject = {
      safeParse: vi.fn().mockReturnValue({ 
        success: false, 
        error: { issues: ['missed validation error'] } 
      })
    }
    vi.mocked(z.object).mockReturnValue(mockZodObject as any)
    vi.mocked(z.string).mockReturnValue({} as any)

    mockEngine.translateMissed.mockResolvedValue({ invalid: 'result' })

    await translate(mockEngine, options)

    expect(mockLogger.error).toHaveBeenCalledWith('Engine does not returned proper translation structure!')
    expect(mockLogger.error).toHaveBeenCalledWith('Validation error:', ['missed validation error'])
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

  it('should write cache and namespaces when dirty', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace = createMockNamespace('test.json', true)
    const mockCache = createMockCache(false, true)
    
    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    const { z } = await import('zod')
    
    const mockLogger = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      engineLog: vi.fn(),
      engineDebug: vi.fn(),
      engineVerbose: vi.fn(),
      setDebug: vi.fn(),
      setVerbose: vi.fn()
    }
    
    options.logger = mockLogger
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    
    const mockZodObject = {
      safeParse: vi.fn().mockReturnValue({ success: true })
    }
    vi.mocked(z.object).mockReturnValue(mockZodObject as any)
    vi.mocked(z.string).mockReturnValue({} as any)

    mockEngine.translate.mockResolvedValue({ pl: { test: 'Test PL' } })

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
    
    const mockLogger = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      engineLog: vi.fn(),
      engineDebug: vi.fn(),
      engineVerbose: vi.fn(),
      setDebug: vi.fn(),
      setVerbose: vi.fn()
    }
    
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
    
    const mockLogger = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      engineLog: vi.fn(),
      engineDebug: vi.fn(),
      engineVerbose: vi.fn(),
      setDebug: vi.fn(),
      setVerbose: vi.fn()
    }
    
    options.logger = mockLogger
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)

    await translate(mockEngine, options)

    expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('No changes detected'))
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
    const { z } = await import('zod')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    vi.mocked(createCacheTranslateEngine).mockReturnValue(mockCacheEngine as any)
    vi.mocked(clearNullsFromResult).mockReturnValue({})
    vi.mocked(countTranslatedKeys).mockReturnValue(0)
    
    const mockZodObject = {
      safeParse: vi.fn().mockReturnValue({ success: true })
    }
    vi.mocked(z.object).mockReturnValue(mockZodObject as any)
    vi.mocked(z.string).mockReturnValue({} as any)

    mockEngine.translateMissed.mockResolvedValue({ pl: { stillMissing: 'Still Missing PL' } })

    await translate(mockEngine, options)

    // The logger should be called with debug message about missed translations
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Missed translations structure prepared')
    )
  })

  it('should handle multiple namespaces', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['Test context']
    }

    const mockNamespace1 = createMockNamespace('common.json', true)
    const mockNamespace2 = createMockNamespace('auth.json', true)
    const mockCache = createMockCache(false, true)
    
    const { readTranslationsNamespaces, applyEngineTranslations } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    const { z } = await import('zod')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace1, mockNamespace2])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    
    const mockZodObject = {
      safeParse: vi.fn().mockReturnValue({ success: true })
    }
    vi.mocked(z.object).mockReturnValue(mockZodObject as any)
    vi.mocked(z.string).mockReturnValue({} as any)

    mockEngine.translate.mockResolvedValue({ pl: { test: 'Test PL' }, de: { test: 'Test DE' } })

    await translate(mockEngine, options)

    expect(mockEngine.translate).toHaveBeenCalledTimes(2)
    expect(applyEngineTranslations).toHaveBeenCalledTimes(2)
    expect(mockNamespace1.write).toHaveBeenCalled()
    expect(mockNamespace2.write).toHaveBeenCalled()
  })

  it('should handle empty target languages after filtering', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['en'], // Only base language
      applicationContextEntries: ['Test context']
    }

    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([])
    vi.mocked(readTranslationsCache).mockResolvedValue(createMockCache())

    await translate(mockEngine, options)

    expect(options.targetLanguageCodes).toEqual([])
    expect(mockEngine.translate).not.toHaveBeenCalled()
  })

  it('should trim and add dots to application context entries with whitespace', async () => {
    const options: TranslateOptions = {
      languagesDirectoryPath: './test-languages',
      baseLanguageCode: 'en',
      targetLanguageCodes: ['pl', 'de'],
      applicationContextEntries: ['  Test context  ', '  Another context.  ', '  Third context  ']
    }

    const { readTranslationsNamespaces } = await import('$/namespace')
    const { readTranslationsCache } = await import('$/cache')
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([])
    vi.mocked(readTranslationsCache).mockResolvedValue(createMockCache())

    await translate(mockEngine, options)

    expect(options.applicationContextEntries).toEqual([
      'Test context.',
      'Another context.',
      'Third context.'
    ])
  })
})