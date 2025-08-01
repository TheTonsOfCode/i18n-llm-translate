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

describe('Engine Validation', () => {
  beforeEach(() => {
    setupTestEnvironment()
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
    
    const mockLogger = createMockLogger()
    
    options.logger = mockLogger
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)

    mockEngine.translate.mockResolvedValue({ invalid: 'result' })

    await translate(mockEngine, options)

    expect(mockLogger.error).toHaveBeenCalledWith('Engine does not returned proper translation structure!')
    expect(mockLogger.debug).toHaveBeenCalledWith('Base differences:', { test: 'Test' })
    expect(mockLogger.error).toHaveBeenCalledWith('Validation error:', expect.any(Array))
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
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)
    const mockLogger = createMockLogger()
    
    options.logger = mockLogger
    
    vi.mocked(createCacheTranslateEngine).mockReturnValue(mockCacheEngine as any)
    vi.mocked(clearNullsFromResult).mockReturnValue({})
    vi.mocked(countTranslatedKeys).mockReturnValue(0)

    mockEngine.translateMissed.mockResolvedValue({ invalid: 'result' })

    await translate(mockEngine, options)

    expect(mockLogger.error).toHaveBeenCalledWith('Engine does not returned proper translation structure!')
    expect(mockLogger.error).toHaveBeenCalledWith('Validation error:', expect.any(Array))
  })
}) 