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

describe('Translation Processing', () => {
  beforeEach(() => {
    setupTestEnvironment()
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
    
    vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
    vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)

    mockEngine.translate.mockResolvedValue({ pl: { test: 'Test PL' }, de: { test: 'Test DE' } })

    await translate(mockEngine, options)

    expect(mockEngine.translate).toHaveBeenCalledWith({ test: 'Test' }, options)
    expect(applyEngineTranslations).toHaveBeenCalledWith(mockNamespace, { pl: { test: 'Test PL' }, de: { test: 'Test DE' } })
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

    mockEngine.translate.mockResolvedValue({ pl: { test: 'Test PL' }, de: { test: 'Test DE' } })

    await translate(mockEngine, options)

    expect(mockEngine.translate).toHaveBeenCalledTimes(2)
    expect(applyEngineTranslations).toHaveBeenCalledTimes(2)
    expect(mockNamespace1.write).toHaveBeenCalled()
    expect(mockNamespace2.write).toHaveBeenCalled()
  })
}) 