import { vi, Mock } from 'vitest'
import { TranslateEngine, TranslateNamespace } from '$/type'

export const mockEngine = {
  name: 'test-engine',
  type: 'llm',
  translate: vi.fn().mockResolvedValue({}),
  translateMissed: vi.fn().mockResolvedValue({})
} as TranslateEngine & {
  translate: Mock
  translateMissed: Mock
}

export const createMockNamespace = (jsonFileName: string, _hasDifferences = false, hasMissing = false): TranslateNamespace => ({
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

export const createMockCache = (dirtyCache = false, hasDifferences = false) => ({
  cache: {},
  cleanCache: vi.fn().mockReturnValue(dirtyCache),
  syncCacheWithNamespaces: vi.fn(),
  write: vi.fn().mockResolvedValue(undefined),
  getBaseLanguageTranslationDifferences: vi.fn().mockReturnValue(hasDifferences ? { test: 'Test' } : undefined)
})

export const setupTestEnvironment = () => {
  vi.clearAllMocks()
  // Reset console.log mock
  vi.spyOn(console, 'log').mockImplementation(() => {})
} 