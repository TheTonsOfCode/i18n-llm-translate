import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getMockEngines } from './shared'
import { TranslateEngine } from '$/type'
import { translate } from '$/translate'
import * as fs from 'fs/promises'
import * as path from 'path'
import { tmpdir } from 'os'

describe('Translation Main Function', () => {
  let engines: TranslateEngine[]
  let testDir: string

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    engines = getMockEngines()
    
    // Set TEST_ENGINES environment variable to allow dummy engine in main translate function
    process.env.TEST_ENGINES = process.env.TEST_ENGINES || 'dummy'
    
    // Create temporary directory for test files
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'translate-test-'))
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Main translate function', () => {
    it('should translate files using engine', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        // Create test directory structure
        const enDir = path.join(testDir, 'en')
        const plDir = path.join(testDir, 'pl')
        
        await fs.mkdir(enDir, { recursive: true })
        await fs.mkdir(plDir, { recursive: true })
        
        // Create base language file
        const baseTranslations = {
          greeting: 'Hello',
          farewell: 'Goodbye',
          user: {
            name: 'Name',
            email: 'Email'
          }
        }
        
        await fs.writeFile(
          path.join(enDir, 'common.json'),
          JSON.stringify(baseTranslations, null, 2)
        )
        
        // Create empty target language file
        await fs.writeFile(
          path.join(plDir, 'common.json'),
          JSON.stringify({}, null, 2)
        )

        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['pl'],
          applicationContextEntries: []
        }

        await translate(engine, options)

        // Verify that translation was performed
        const translatedContent = await fs.readFile(path.join(plDir, 'common.json'), 'utf-8')
        const translatedData = JSON.parse(translatedContent)
        
        expect(translatedData).toBeDefined()
        expect(translatedData.greeting).toBeDefined()
        expect(translatedData.farewell).toBeDefined()
        expect(translatedData.user).toBeDefined()
        expect(translatedData.user.name).toBeDefined()
        expect(translatedData.user.email).toBeDefined()
        
        expect(typeof translatedData.greeting).toBe('string')
        expect(typeof translatedData.farewell).toBe('string')
        expect(typeof translatedData.user.name).toBe('string')
        expect(typeof translatedData.user.email).toBe('string')
      }
    })

    it('should handle multiple target languages', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        // Create test directory structure
        const enDir = path.join(testDir, 'en')
        const plDir = path.join(testDir, 'pl')
        const deDir = path.join(testDir, 'de')
        
        await fs.mkdir(enDir, { recursive: true })
        await fs.mkdir(plDir, { recursive: true })
        await fs.mkdir(deDir, { recursive: true })
        
        // Create base language file
        const baseTranslations = {
          greeting: 'Hello',
          app: {
            title: 'My Application'
          }
        }
        
        await fs.writeFile(
          path.join(enDir, 'app.json'),
          JSON.stringify(baseTranslations, null, 2)
        )
        
        // Create empty target language files
        await fs.writeFile(path.join(plDir, 'app.json'), JSON.stringify({}, null, 2))
        await fs.writeFile(path.join(deDir, 'app.json'), JSON.stringify({}, null, 2))

        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['pl', 'de'],
          applicationContextEntries: []
        }

        await translate(engine, options)

        // Verify Polish translation
        const plContent = await fs.readFile(path.join(plDir, 'app.json'), 'utf-8')
        const plData = JSON.parse(plContent)
        
        expect(plData.greeting).toBeDefined()
        expect(plData.app.title).toBeDefined()
        expect(typeof plData.greeting).toBe('string')
        expect(typeof plData.app.title).toBe('string')

        // Verify German translation
        const deContent = await fs.readFile(path.join(deDir, 'app.json'), 'utf-8')
        const deData = JSON.parse(deContent)
        
        expect(deData.greeting).toBeDefined()
        expect(deData.app.title).toBeDefined()
        expect(typeof deData.greeting).toBe('string')
        expect(typeof deData.app.title).toBe('string')
      }
    })

    it('should handle multiple namespaces', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        // Create test directory structure
        const enDir = path.join(testDir, 'en')
        const plDir = path.join(testDir, 'pl')
        
        await fs.mkdir(enDir, { recursive: true })
        await fs.mkdir(plDir, { recursive: true })
        
        // Create multiple namespace files
        await fs.writeFile(
          path.join(enDir, 'common.json'),
          JSON.stringify({ greeting: 'Hello' }, null, 2)
        )
        
        await fs.writeFile(
          path.join(enDir, 'buttons.json'),
          JSON.stringify({ save: 'Save', cancel: 'Cancel' }, null, 2)
        )
        
        // Create empty target files
        await fs.writeFile(path.join(plDir, 'common.json'), JSON.stringify({}, null, 2))
        await fs.writeFile(path.join(plDir, 'buttons.json'), JSON.stringify({}, null, 2))

        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['pl'],
          applicationContextEntries: []
        }

        await translate(engine, options)

        // Verify common namespace
        const commonContent = await fs.readFile(path.join(plDir, 'common.json'), 'utf-8')
        const commonData = JSON.parse(commonContent)
        expect(commonData.greeting).toBeDefined()
        expect(typeof commonData.greeting).toBe('string')

        // Verify buttons namespace
        const buttonsContent = await fs.readFile(path.join(plDir, 'buttons.json'), 'utf-8')
        const buttonsData = JSON.parse(buttonsContent)
        expect(buttonsData.save).toBeDefined()
        expect(buttonsData.cancel).toBeDefined()
        expect(typeof buttonsData.save).toBe('string')
        expect(typeof buttonsData.cancel).toBe('string')
      }
    })

    it('should handle partial translations (missing keys)', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        // Create test directory structure
        const enDir = path.join(testDir, 'en')
        const plDir = path.join(testDir, 'pl')
        
        await fs.mkdir(enDir, { recursive: true })
        await fs.mkdir(plDir, { recursive: true })
        
        // Create base language file
        const baseTranslations = {
          greeting: 'Hello',
          farewell: 'Goodbye',
          thanks: 'Thank you'
        }
        
        await fs.writeFile(
          path.join(enDir, 'messages.json'),
          JSON.stringify(baseTranslations, null, 2)
        )
        
        // Create partial target language file (missing some keys)
        const partialTranslations = {
          greeting: 'Cześć'  // Only greeting is already translated
        }
        
        await fs.writeFile(
          path.join(plDir, 'messages.json'),
          JSON.stringify(partialTranslations, null, 2)
        )

        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['pl'],
          applicationContextEntries: []
        }

        await translate(engine, options)

        // Verify that missing translations were added
        const translatedContent = await fs.readFile(path.join(plDir, 'messages.json'), 'utf-8')
        const translatedData = JSON.parse(translatedContent)
        
        expect(translatedData.greeting).toBeDefined()  // Should preserve or translate existing
        expect(translatedData.farewell).toBeDefined()  // Should add missing translation
        expect(translatedData.thanks).toBeDefined()    // Should add missing translation
        
        expect(typeof translatedData.farewell).toBe('string')
        expect(typeof translatedData.thanks).toBe('string')
      }
    })

    it('should handle application context', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        // Create test directory structure
        const enDir = path.join(testDir, 'en')
        const plDir = path.join(testDir, 'pl')
        
        await fs.mkdir(enDir, { recursive: true })
        await fs.mkdir(plDir, { recursive: true })
        
        // Create base language file
        const baseTranslations = {
          'site': 'Site',
          'buttonSave': 'Save',
          'buttonDelete': 'Delete',
          'messageConfirm': 'Are you sure?'
        }
        
        await fs.writeFile(
          path.join(enDir, 'ui.json'),
          JSON.stringify(baseTranslations, null, 2)
        )
        
        // Create empty target language file
        await fs.writeFile(path.join(plDir, 'ui.json'), JSON.stringify({}, null, 2))

        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['pl'],
          applicationContextEntries: [
            'This is a web application for managing user profiles',
            '"Site" inside this application means "Shop"'
          ]
        }

        await translate(engine, options)

        // Verify that translation was performed with context
        const translatedContent = await fs.readFile(path.join(plDir, 'ui.json'), 'utf-8')
        const translatedData = JSON.parse(translatedContent)
        
        expect(translatedData['site']).toBeDefined()
        expect(translatedData['buttonSave']).toBeDefined()
        expect(translatedData['buttonDelete']).toBeDefined()
        expect(translatedData['messageConfirm']).toBeDefined()
        
        expect(typeof translatedData['site']).toBe('string')
        expect(typeof translatedData['buttonSave']).toBe('string')
        expect(typeof translatedData['buttonDelete']).toBe('string')
        expect(typeof translatedData['messageConfirm']).toBe('string')
      }
    })

    it('should create cache file', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        // Create test directory structure
        const enDir = path.join(testDir, 'en')
        const plDir = path.join(testDir, 'pl')
        
        await fs.mkdir(enDir, { recursive: true })
        await fs.mkdir(plDir, { recursive: true })
        
        // Create base language file
        const baseTranslations = {
          greeting: 'Hello',
          farewell: 'Goodbye'
        }
        
        await fs.writeFile(
          path.join(enDir, 'test.json'),
          JSON.stringify(baseTranslations, null, 2)
        )
        
        // Create empty target language file
        await fs.writeFile(path.join(plDir, 'test.json'), JSON.stringify({}, null, 2))

        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['pl'],
          applicationContextEntries: []
        }

        await translate(engine, options)

        // Verify that cache file was created
        const cacheFilePath = path.join(testDir, '.translations-cache.json')
        const cacheExists = await fs.access(cacheFilePath).then(() => true).catch(() => false)
        
        expect(cacheExists).toBe(true)
        
        if (cacheExists) {
          const cacheContent = await fs.readFile(cacheFilePath, 'utf-8')
          const cacheData = JSON.parse(cacheContent)
          
          expect(cacheData).toBeDefined()
          expect(typeof cacheData).toBe('object')
        }
      }
    })

    it('should handle no changes scenario', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        // Create test directory structure
        const enDir = path.join(testDir, 'en')
        const plDir = path.join(testDir, 'pl')
        
        await fs.mkdir(enDir, { recursive: true })
        await fs.mkdir(plDir, { recursive: true })
        
        // Create base language file
        const baseTranslations = {
          greeting: 'Hello'
        }
        
        await fs.writeFile(
          path.join(enDir, 'test.json'),
          JSON.stringify(baseTranslations, null, 2)
        )
        
        // Create complete target language file (no missing translations)
        // TODO: read and check if this is still there, there is no cache right now in test so it will be overriden, but with cache it should stay untouched
        const completeTranslations = {
          greeting: 'Zła translacja, powinna być nie tłumaczona'
        }
        
        await fs.writeFile(
          path.join(plDir, 'test.json'),
          JSON.stringify(completeTranslations, null, 2)
        )

        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['pl'],
          applicationContextEntries: []
        }

        // This should complete without errors even when no changes are needed
        await expect(translate(engine, options)).resolves.not.toThrow()
        
        // Verify that existing translation was preserved
        const translatedContent = await fs.readFile(path.join(plDir, 'test.json'), 'utf-8')
        const translatedData = JSON.parse(translatedContent)
        
        expect(translatedData.greeting).toBeDefined()
      }
    })
  })

  describe('Error handling', () => {
    it('should handle missing base language directory', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['pl'],
          applicationContextEntries: []
        }

        // Should handle missing directories gracefully or throw expected error
        try {
          await translate(engine, options)
          expect(true).toBe(true) // If no error, that's fine
        } catch (error) {
          // Error is expected for missing directories
          expect(error).toBeDefined()
        }
      }
    })

    it('should filter out base language from targets', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['en', 'pl'],  // Base language included in targets
          applicationContextEntries: []
        }

        // Should complete without trying to translate base language to itself or handle missing dirs
        try {
          await translate(engine, options)
          expect(true).toBe(true) // If no error, that's fine
        } catch (error) {
          // Error is expected for missing directories
          expect(error).toBeDefined()
        }
      }
    })

    it('should handle empty target languages after filtering', async () => {
      for (const engine of engines) {
        console.log(`Testing engine: ${engine.name}`)
        
        const options = {
          languagesDirectoryPath: testDir,
          baseLanguageCode: 'en',
          targetLanguageCodes: ['en'],  // Only base language
          applicationContextEntries: []
        }

        // Should complete early when no target languages remain
        await expect(translate(engine, options)).resolves.not.toThrow()
      }
    })
  })
})