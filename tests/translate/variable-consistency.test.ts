import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { translate } from '$/index'
import { TranslateEngine, TranslateOptions, TranslateNamespace } from '$/type'
import { extractVariablesFromString, createVariableConsistencySchema, createObjectVariableConsistencySchema } from '$/validation'
import {createMockLogger} from "../mock";

// Mock dependencies
vi.mock('$/cache')
vi.mock('$/cleaner')
vi.mock('$/namespace')
vi.mock('$/util')
vi.mock('$/engines/cache')

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

describe('Variable Consistency Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console.log mock
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('extractVariablesFromString', () => {
    it('should extract single variable from string', () => {
      const result = extractVariablesFromString('Hello {{user}}!');
      expect(result).toEqual(['user']);
    });

    it('should extract multiple variables from string', () => {
      const result = extractVariablesFromString('Hello {{user}}, you have {{count}} messages');
      expect(result).toEqual(['user', 'count']);
    });

    it('should extract variables with different spacing', () => {
      const result = extractVariablesFromString('Hello {{ user }}, you have {{count}} messages');
      expect(result).toEqual(['user', 'count']);
    });

    it('should return empty array for string without variables', () => {
      const result = extractVariablesFromString('Hello world!');
      expect(result).toEqual([]);
    });

    it('should handle duplicate variables', () => {
      const result = extractVariablesFromString('Hello {{user}}, welcome back {{user}}!');
      expect(result).toEqual(['user', 'user']);
    });

    it('should handle empty string', () => {
      const result = extractVariablesFromString('');
      expect(result).toEqual([]);
    });

    it('should handle malformed variable syntax', () => {
      const result = extractVariablesFromString('Hello {user}, you have {{count}} messages');
      expect(result).toEqual(['count']);
    });
  });

  describe('createVariableConsistencySchema', () => {
    it('should pass validation when variables are consistent', () => {
      const schema = createVariableConsistencySchema('Hello {{user}}!');
      const result = schema.safeParse('Cześć {{user}}!');
      expect(result.success).toBe(true);
    });

    it('should pass validation when no variables are present', () => {
      const schema = createVariableConsistencySchema('Hello world!');
      const result = schema.safeParse('Cześć świecie!');
      expect(result.success).toBe(true);
    });

    it('should fail validation when original variable is missing', () => {
      const schema = createVariableConsistencySchema('Hello {{user}}!');
      const result = schema.safeParse('Cześć!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Variable mismatch');
        expect(result.error.issues[0].message).toContain('user');
      }
    });

    it('should fail validation when extra variable is added', () => {
      const schema = createVariableConsistencySchema('Hello {{user}}!');
      const result = schema.safeParse('Cześć {{user}}, masz {{count}} wiadomości!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Variable mismatch');
        expect(result.error.issues[0].message).toContain('count');
      }
    });

    it('should fail validation when variable name is changed', () => {
      const schema = createVariableConsistencySchema('Hello {{user}}!');
      const result = schema.safeParse('Cześć {{username}}!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Variable mismatch');
      }
    });

    it('should handle multiple variables correctly', () => {
      const schema = createVariableConsistencySchema('Hello {{user}}, you have {{count}} messages');
      const result = schema.safeParse('Cześć {{user}}, masz {{count}} wiadomości');
      expect(result.success).toBe(true);
    });

    it('should fail when one of multiple variables is missing', () => {
      const schema = createVariableConsistencySchema('Hello {{user}}, you have {{count}} messages');
      const result = schema.safeParse('Cześć {{user}}, masz wiadomości');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('count');
      }
    });
  });

  describe('createObjectVariableConsistencySchema', () => {
    it('should validate nested object with consistent variables', () => {
      const originalObject = {
        greeting: 'Hello {{user}}!',
        message: 'You have {{count}} messages',
        nested: {
          welcome: 'Welcome {{user}}!'
        }
      };
      
      const schema = createObjectVariableConsistencySchema(originalObject);
      const translatedObject = {
        greeting: 'Cześć {{user}}!',
        message: 'Masz {{count}} wiadomości',
        nested: {
          welcome: 'Witaj {{user}}!'
        }
      };
      
      const result = schema.safeParse(translatedObject);
      expect(result.success).toBe(true);
    });

    it('should fail validation when nested object has inconsistent variables', () => {
      const originalObject = {
        greeting: 'Hello {{user}}!',
        nested: {
          welcome: 'Welcome {{user}}!'
        }
      };
      
      const schema = createObjectVariableConsistencySchema(originalObject);
      const translatedObject = {
        greeting: 'Cześć {{user}}!',
        nested: {
          welcome: 'Witaj {{username}}!' // Changed variable name
        }
      };
      
      const result = schema.safeParse(translatedObject);
      expect(result.success).toBe(false);
    });

    it('should handle mixed content types', () => {
      const originalObject = {
        stringValue: 'Hello {{user}}!',
        numberValue: 42,
        booleanValue: true,
        nullValue: null
      };
      
      const schema = createObjectVariableConsistencySchema(originalObject);
      const translatedObject = {
        stringValue: 'Cześć {{user}}!',
        numberValue: 42,
        booleanValue: true,
        nullValue: null
      };
      
      const result = schema.safeParse(translatedObject);
      expect(result.success).toBe(true);
    });
  });

  describe('Integration with translation validation', () => {
    it('should validate engine results with variable consistency', async () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: './test-languages',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl'],
        applicationContextEntries: ['Test context']
      };

      const mockNamespace = {
        ...createMockNamespace('test.json', true),
        baseLanguageTranslations: { 
          greeting: 'Hello {{user}}!', 
          message: 'You have {{count}} messages' 
        }
      };
      const mockCache = {
        ...createMockCache(false, true),
        getBaseLanguageTranslationDifferences: vi.fn().mockReturnValue({ 
          greeting: 'Hello {{user}}!', 
          message: 'You have {{count}} messages' 
        })
      };
      
      const { readTranslationsNamespaces, applyEngineTranslations } = await import('$/namespace')
      const { readTranslationsCache } = await import('$/cache')
      
      vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
      vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)

      // Mock engine to return translation with consistent variables
      mockEngine.translate.mockResolvedValue({ 
        pl: { 
          greeting: 'Cześć {{user}}!',
          message: 'Masz {{count}} wiadomości'
        } 
      })

      await translate(mockEngine, options)

      expect(mockEngine.translate).toHaveBeenCalledWith(
        { greeting: 'Hello {{user}}!', message: 'You have {{count}} messages' }, 
        options
      )
      expect(applyEngineTranslations).toHaveBeenCalledWith(mockNamespace, { 
        pl: { 
          greeting: 'Cześć {{user}}!',
          message: 'Masz {{count}} wiadomości'
        } 
      })
    });

    it('should reject engine results with inconsistent variables', async () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: './test-languages',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl'],
        applicationContextEntries: ['Test context']
      };

      const mockNamespace = {
        ...createMockNamespace('test.json', true),
        baseLanguageTranslations: { 
          greeting: 'Hello {{user}}!'
        }
      };
      const mockCache = {
        ...createMockCache(false, true),
        getBaseLanguageTranslationDifferences: vi.fn().mockReturnValue({ 
          greeting: 'Hello {{user}}!'
        })
      };
      
      const { readTranslationsNamespaces } = await import('$/namespace')
      const { readTranslationsCache } = await import('$/cache')
      
      const mockLogger = createMockLogger();
      
      options.logger = mockLogger
      
      vi.mocked(readTranslationsNamespaces).mockResolvedValue([mockNamespace])
      vi.mocked(readTranslationsCache).mockResolvedValue(mockCache)

      // Mock engine to return translation with inconsistent variables
      mockEngine.translate.mockResolvedValue({ 
        pl: { 
          greeting: 'Cześć {{username}}!' // Changed from {{user}} to {{username}}
        } 
      })

      await translate(mockEngine, options)

      expect(mockLogger.error).toHaveBeenCalledWith('Engine does not returned proper translation structure!')
      expect(mockLogger.error).toHaveBeenCalledWith('Validation error:', expect.any(Array))
    });
  });
}) 