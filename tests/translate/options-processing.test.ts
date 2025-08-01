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

describe('Options Processing', () => {
  beforeEach(() => {
    setupTestEnvironment()
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