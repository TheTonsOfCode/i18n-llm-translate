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

describe('Cleanup Functionality', () => {
  beforeEach(() => {
    setupTestEnvironment()
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
}) 