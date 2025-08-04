import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getMockEngines } from '../shared'
import { TranslateEngine, TranslateNamespaceMissingTranslations } from '$/type'

describe('Translation Engines - translateMissed', () => {
  let engines: TranslateEngine[]

  beforeEach(() => {
    vi.clearAllMocks()
    // vi.spyOn(console, 'log').mockImplementation(() => {})
    engines = getMockEngines()
  })

  describe('Engine initialization', () => {
    it('should have translateMissed function', () => {
      engines.forEach(engine => {
        expect(engine.translateMissed).toBeDefined()
        expect(typeof engine.translateMissed).toBe('function')
      })
    })
  })

  describe('Basic translateMissed functionality', () => {
    it('should translate missing translations for single language', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const missingTranslations: TranslateNamespaceMissingTranslations = {
          baseLanguageTranslations: {
            'greeting': 'Hello',
            'farewell': 'Goodbye'
          },
          targetLanguageTranslationsKeys: {
            'pl': {
              'greeting': 'Hello',
              'farewell': 'Goodbye'
            }
          }
        }

        const result = await engine.translateMissed(
          missingTranslations,
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl'],
            applicationContextEntries: []
          }
        )

        expect(result).toBeDefined()
        expect(result.pl).toBeDefined()
        expect(result.pl.greeting).toBeDefined()
        expect(result.pl.farewell).toBeDefined()
        expect(typeof result.pl.greeting).toBe('string')
        expect(typeof result.pl.farewell).toBe('string')
      }
    })

    it('should translate missing translations for multiple languages', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const missingTranslations: TranslateNamespaceMissingTranslations = {
          baseLanguageTranslations: {
            'greeting': 'Hello'
          },
          targetLanguageTranslationsKeys: {
            'pl': {
              'greeting': 'Hello'
            },
            'de': {
              'greeting': 'Hello'
            }
          }
        }

        const result = await engine.translateMissed(
          missingTranslations,
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl', 'de'],
            applicationContextEntries: []
          }
        )

        expect(result).toBeDefined()
        expect(result.pl).toBeDefined()
        expect(result.de).toBeDefined()
        expect(result.pl.greeting).toBeDefined()
        expect(result.de.greeting).toBeDefined()
        expect(typeof result.pl.greeting).toBe('string')
        expect(typeof result.de.greeting).toBe('string')
      }
    })

    it('should handle different missing translations per language', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const missingTranslations: TranslateNamespaceMissingTranslations = {
          baseLanguageTranslations: {
            'greeting': 'Hello',
            'farewell': 'Goodbye',
            'thanks': 'Thank you'
          },
          targetLanguageTranslationsKeys: {
            'pl': {
              'greeting': 'Hello',
              'thanks': 'Thank you'
            },
            'de': {
              'farewell': 'Goodbye',
              'thanks': 'Thank you'
            }
          }
        }

        const result = await engine.translateMissed(
          missingTranslations,
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl', 'de'],
            applicationContextEntries: []
          }
        )

        expect(result).toBeDefined()
        expect(result.pl).toBeDefined()
        expect(result.de).toBeDefined()
        
        // Polish should have greeting and thanks
        expect(result.pl.greeting).toBeDefined()
        expect(result.pl.thanks).toBeDefined()
        expect(typeof result.pl.greeting).toBe('string')
        expect(typeof result.pl.thanks).toBe('string')
        
        // German should have farewell and thanks
        expect(result.de.farewell).toBeDefined()
        expect(result.de.thanks).toBeDefined()
        expect(typeof result.de.farewell).toBe('string')
        expect(typeof result.de.thanks).toBe('string')
      }
    })
  })

  describe('Nested object translation', () => {
    it('should translate nested missing translations', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const missingTranslations: TranslateNamespaceMissingTranslations = {
          baseLanguageTranslations: {
            'user.name': 'Name',
            'user.profile.age': 'Age',
            'app.title': 'Application'
          },
          targetLanguageTranslationsKeys: {
            'pl': {
              'user.name': 'Name',
              'user.profile.age': 'Age',
              'app.title': 'Application'
            }
          }
        }

        const result = await engine.translateMissed(
          missingTranslations,
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl'],
            applicationContextEntries: []
          }
        )

        expect(result).toBeDefined()
        expect(result.pl).toBeDefined()
        expect(result.pl['user.name']).toBeDefined()
        expect(result.pl['user.profile.age']).toBeDefined()
        expect(result.pl['app.title']).toBeDefined()
        
        expect(typeof result.pl['user.name']).toBe('string')
        expect(typeof result.pl['user.profile.age']).toBe('string')
        expect(typeof result.pl['app.title']).toBe('string')
      }
    })
  })

  describe('Context-aware translation', () => {
    it('should handle application context in missing translations', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const missingTranslations: TranslateNamespaceMissingTranslations = {
          baseLanguageTranslations: {
            'button.save': 'Save',
            'button.cancel': 'Cancel'
          },
          targetLanguageTranslationsKeys: {
            'pl': {
              'button.save': 'Save',
              'button.cancel': 'Cancel'
            }
          }
        }

        const result = await engine.translateMissed(
          missingTranslations,
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl'],
            applicationContextEntries: [
              'This is a web application for managing user profiles'
            ]
          }
        )

        expect(result).toBeDefined()
        expect(result.pl).toBeDefined()
        expect(result.pl['button.save']).toBeDefined()
        expect(result.pl['button.cancel']).toBeDefined()
        expect(typeof result.pl['button.save']).toBe('string')
        expect(typeof result.pl['button.cancel']).toBe('string')
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle empty missing translations', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const missingTranslations: TranslateNamespaceMissingTranslations = {
          baseLanguageTranslations: {},
          targetLanguageTranslationsKeys: {
            'pl': {}
          }
        }

        const result = await engine.translateMissed(
          missingTranslations,
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl'],
            applicationContextEntries: []
          }
        )

        expect(result).toBeDefined()
        expect(result.pl).toBeDefined()
        expect(Object.keys(result.pl)).toHaveLength(0)
      }
    })

    it('should handle special characters in missing translations', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const missingTranslations: TranslateNamespaceMissingTranslations = {
          baseLanguageTranslations: {
            'special': 'Hello & welcome! (2024)',
            'unicode': 'Café & résumé'
          },
          targetLanguageTranslationsKeys: {
            'pl': {
              'special': 'Hello & welcome! (2024)',
              'unicode': 'Café & résumé'
            }
          }
        }

        const result = await engine.translateMissed(
          missingTranslations,
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl'],
            applicationContextEntries: []
          }
        )

        expect(result).toBeDefined()
        expect(result.pl).toBeDefined()
        expect(result.pl.special).toBeDefined()
        expect(result.pl.unicode).toBeDefined()
        expect(typeof result.pl.special).toBe('string')
        expect(typeof result.pl.unicode).toBe('string')
        expect(result.pl.special.length).toBeGreaterThan(0)
        expect(result.pl.unicode.length).toBeGreaterThan(0)
      }
    })

    it('should handle partial missing translations', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const missingTranslations: TranslateNamespaceMissingTranslations = {
          baseLanguageTranslations: {
            'greeting': 'Hello',
            'farewell': 'Goodbye',
            'thanks': 'Thank you'
          },
          targetLanguageTranslationsKeys: {
            'pl': {
              'greeting': 'Hello'  // Only greeting is missing in Polish
            },
            'de': {
              'farewell': 'Goodbye',  // Only farewell is missing in German
              'thanks': 'Thank you'
            }
          }
        }

        const result = await engine.translateMissed(
          missingTranslations,
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl', 'de'],
            applicationContextEntries: []
          }
        )

        expect(result).toBeDefined()
        expect(result.pl).toBeDefined()
        expect(result.de).toBeDefined()
        
        // Polish should only have greeting
        expect(result.pl.greeting).toBeDefined()
        expect(typeof result.pl.greeting).toBe('string')
        
        // German should have farewell and thanks
        expect(result.de.farewell).toBeDefined()
        expect(result.de.thanks).toBeDefined()
        expect(typeof result.de.farewell).toBe('string')
        expect(typeof result.de.thanks).toBe('string')
      }
    })
  })

  describe('Performance', () => {
    it('should complete missing translation within reasonable time', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const startTime = Date.now()
        
        const missingTranslations: TranslateNamespaceMissingTranslations = {
          baseLanguageTranslations: {
            'test': 'Test message'
          },
          targetLanguageTranslationsKeys: {
            'pl': {
              'test': 'Test message'
            }
          }
        }

        await engine.translateMissed(
          missingTranslations,
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl'],
            applicationContextEntries: []
          }
        )
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        // Should complete within 30 seconds (generous timeout for API calls)
        expect(duration).toBeLessThan(30000)
      }
    })
  })
})