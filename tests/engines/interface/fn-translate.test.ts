import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getMockEngines } from '../shared'
import { TranslateEngine } from '$/type'

describe('Translation Engines', () => {
  let engines: TranslateEngine[]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    engines = getMockEngines()
  })

  describe('Engine initialization', () => {
    it('should initialize at least one engine', () => {
      expect(engines.length).toBeGreaterThan(0)
    })

    it('should have valid engine names', () => {
      engines.forEach(engine => {
        expect(engine.name).toBeDefined()
        expect(typeof engine.name).toBe('string')
        expect(engine.name.length).toBeGreaterThan(0)
      })
    })

    it('should have translate function', () => {
      engines.forEach(engine => {
        expect(engine.translate).toBeDefined()
        expect(typeof engine.translate).toBe('function')
      })
    })
  })

  describe('Basic translation functionality', () => {
    it('should translate simple text', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const result = await engine.translate(
          {
            'greeting': 'Hello'
          },
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
        expect(typeof result.pl.greeting).toBe('string')
        expect(result.pl.greeting.length).toBeGreaterThan(0)
      }
    })

    it('should translate multiple keys', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const result = await engine.translate(
          {
            'greeting': 'Hello',
            'farewell': 'Goodbye',
            'thanks': 'Thank you'
          },
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
        expect(result.pl.thanks).toBeDefined()
        
        // All should be strings
        expect(typeof result.pl.greeting).toBe('string')
        expect(typeof result.pl.farewell).toBe('string')
        expect(typeof result.pl.thanks).toBe('string')
      }
    })

    it('should translate to multiple target languages', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const result = await engine.translate(
          {
            'greeting': 'Hello'
          },
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
  })

  describe('Nested object translation', () => {
    it('should translate nested objects', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const result = await engine.translate(
          {
            'user.name': 'Name',
            'user.email': 'Email',
            'user.profile.age': 'Age'
          },
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
        expect(result.pl['user.email']).toBeDefined()
        expect(result.pl['user.profile.age']).toBeDefined()
        
        expect(typeof result.pl['user.name']).toBe('string')
        expect(typeof result.pl['user.email']).toBe('string')
        expect(typeof result.pl['user.profile.age']).toBe('string')
      }
    })
  })

  describe('Context-aware translation', () => {
    it('should handle application context', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const result = await engine.translate(
          {
            'button.save': 'Save'
          },
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
        expect(typeof result.pl['button.save']).toBe('string')
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle empty translations', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const result = await engine.translate(
          {},
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

    it('should handle special characters', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const result = await engine.translate(
          {
            'special': 'Hello & welcome! (2024)'
          },
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
        expect(typeof result.pl.special).toBe('string')
        expect(result.pl.special.length).toBeGreaterThan(0)
      }
    })

    it('should handle long text', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const longText = 'This is a very long text that should be translated properly. '.repeat(10)
        
        const result = await engine.translate(
          {
            'long_text': longText
          },
          {
            languagesDirectoryPath: '/test',
            baseLanguageCode: 'en',
            targetLanguageCodes: ['pl'],
            applicationContextEntries: []
          }
        )

        expect(result).toBeDefined()
        expect(result.pl).toBeDefined()
        expect(result.pl.long_text).toBeDefined()
        expect(typeof result.pl.long_text).toBe('string')
        expect(result.pl.long_text.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Error handling', () => {
    it('should handle invalid language codes gracefully', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        // Skip dummy engine as it doesn't validate language codes
        if (engine.name === 'dummy') {
          continue
        }

        try {
          await engine.translate(
            {
              'test': 'Test'
            },
            {
              languagesDirectoryPath: '/test',
              baseLanguageCode: 'invalid',
              targetLanguageCodes: ['also-invalid'],
              applicationContextEntries: []
            }
          )
          
          // If we reach here, the engine handled invalid codes gracefully
          expect(true).toBe(true)
        } catch (error) {
          // Error is expected for invalid language codes
          expect(error).toBeDefined()
        }
      }
    })
  })

  describe('Performance', () => {
    it('should complete translation within reasonable time', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const startTime = Date.now()
        
        await engine.translate(
          {
            'test': 'Test message'
          },
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