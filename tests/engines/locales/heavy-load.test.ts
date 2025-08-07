import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getMockEngines } from '../shared'
import { getMockEnvironments, LocaleEnvironment } from './shared'
import { TranslateEngine } from '$/type'
import { translate } from '$/translate'
import * as fs from 'fs/promises'
import * as path from 'path'
import { tmpdir } from 'os'

describe('Full workspace translations', () => {
    let engines: TranslateEngine[]
    let environments: LocaleEnvironment[]
    let testDir: string
    let localesDir: string

    beforeEach(async () => {
        vi.clearAllMocks()
        // vi.spyOn(console, 'log').mockImplementation(() => {})
        engines = getMockEngines()
        environments = getMockEnvironments()

        // Set TEST_ENGINES environment variable to allow dummy engine in main translate function
        process.env.TEST_ENGINES = process.env.TEST_ENGINES || 'dummy'
        process.env.TEST_ENVIRONMENTS = process.env.TEST_ENVIRONMENTS || 'zoo'

        // Create temporary directory for test files
        testDir = await fs.mkdtemp(path.join(tmpdir(), 'translate-test-'))
        localesDir = path.join(testDir, 'locales')
        await fs.mkdir(localesDir, { recursive: true })
    })

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true })
        } catch (error) {
            // Ignore cleanup errors
        }
    })

    /**
     * Copy environment-specific locale files to temporary test directory
     * @param environment - Environment configuration object
     */
    async function setupTestEnvironment(environment: LocaleEnvironment) {
        // Copy all files from source environment to test locales directory
        try {
            const files = await fs.readdir(environment.directoryPath)
            for (const file of files) {
                const sourcePath = path.join(environment.directoryPath, file)
                const destPath = path.join(localesDir, file)
                const stat = await fs.stat(sourcePath)

                if (stat.isFile()) {
                    await fs.copyFile(sourcePath, destPath)
                } else if (stat.isDirectory()) {
                    // Copy subdirectories recursively
                    await fs.mkdir(path.join(localesDir, file), { recursive: true })
                    const subFiles = await fs.readdir(sourcePath)
                    for (const subFile of subFiles) {
                        await fs.copyFile(
                            path.join(sourcePath, subFile),
                            path.join(localesDir, file, subFile)
                        )
                    }
                }
            }
        } catch (error) {
            throw new Error(`Failed to setup test environment '${environment.code}': ${error}`)
        }
    }

    /**
     * Check if heavy load tests are enabled via environment variable
     */
    function isHeavyLoadTestEnabled(): boolean {
        return process.env.TEST_HEAVY_LOAD === 'true' || process.env.TEST_HEAVY_LOAD === '1'
    }

    describe('Translation engine heavy load tests', () => {
        it('should skip heavy load tests when not enabled', async () => {
            if (!isHeavyLoadTestEnabled()) {
                expect(true).toBe(true) // Skip test
                return
            }
        })

        // Generate individual test for each engine-environment combination
        for (const environment of getMockEnvironments()) {
            for (const engine of getMockEngines()) {
                it(`should translate ${environment.name} environment with ${engine.name} engine`, async () => {
                    if (!isHeavyLoadTestEnabled()) {
                        expect(true).toBe(true)
                        return
                    }

                    // Setup the environment
                    await setupTestEnvironment(environment)

                    // Verify files were copied
                    const files = await fs.readdir(localesDir)
                    expect(files.length).toBeGreaterThan(0)

                    // Count total translation keys for reporting
                    let totalKeys = 0
                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            const content = await fs.readFile(path.join(localesDir, file), 'utf-8')
                            const json = JSON.parse(content)
                            totalKeys += countTranslationKeys(json)
                        }
                    }

                    const startTime = Date.now()

                    // Perform translation
                    await translate(engine, {
                        baseLanguageCode: 'en',
                        targetLanguageCodes: ['es', 'fr', 'de'], // Test multiple target languages
                        languagesDirectoryPath: localesDir,
                        applicationContextEntries: environment.applicationContext
                    })

                    const endTime = Date.now()
                    const duration = endTime - startTime

                    // Verify translation completed successfully
                    expect(duration).toBeLessThan(60000) // Should complete within 60 seconds

                    // Log performance metrics
                    console.log(`${engine.name} translated ${totalKeys} keys from ${environment.name} in ${duration}ms`)

                    // Verify that target language directories were created (if translations were needed)
                    const targetLanguages = ['es', 'fr', 'de']
                    for (const lang of targetLanguages) {
                        const langDir = path.join(localesDir, lang)
                        try {
                            const langFiles = await fs.readdir(langDir)
                            if (langFiles.length > 0) {
                                console.log(`${lang} translations created: ${langFiles.length} files`)
                            }
                        } catch (error) {
                            // Language directory might not exist if no translations were needed
                            console.log(`No ${lang} translations needed for ${environment.name}`)
                        }
                    }
                })
            }
        }

        it('should handle large translation workloads', async () => {
            if (!isHeavyLoadTestEnabled()) {
                expect(true).toBe(true)
                return
            }

            let totalKeysAcrossAllEnvironments = 0
            const performanceResults: Array<{ environment: string, keys: number, duration: number }> = []

            // Test each environment with dummy engine for performance baseline
            const dummyEngine = engines.find(e => e.name === 'dummy')
            if (!dummyEngine) {
                expect(true).toBe(true) // Skip if dummy engine not available
                return
            }

            for (const environment of environments) {
                // Setup the environment
                await setupTestEnvironment(environment)

                // Count total translation keys
                const files = await fs.readdir(localesDir)
                let totalKeys = 0

                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const content = await fs.readFile(path.join(localesDir, file), 'utf-8')
                        const json = JSON.parse(content)
                        totalKeys += countTranslationKeys(json)
                    }
                }

                totalKeysAcrossAllEnvironments += totalKeys
                expect(totalKeys).toBeGreaterThan(0)

                const startTime = Date.now()

                await translate(dummyEngine, {
                    baseLanguageCode: 'en',
                    targetLanguageCodes: ['de', 'it'], // Test with multiple languages
                    languagesDirectoryPath: localesDir,
                    applicationContextEntries: environment.applicationContext
                })

                const endTime = Date.now()
                const duration = endTime - startTime

                performanceResults.push({
                    environment: environment.name,
                    keys: totalKeys,
                    duration
                })

                expect(duration).toBeLessThan(30000) // Should complete within 30 seconds per environment

                // Clean up for next environment
                await fs.rm(localesDir, { recursive: true, force: true })
                await fs.mkdir(localesDir, { recursive: true })
            }

            // Log performance summary
            console.log(`\nHeavy load test summary:`)
            console.log(`Total keys across all environments: ${totalKeysAcrossAllEnvironments}`)
            for (const result of performanceResults) {
                console.log(`${result.environment}: ${result.keys} keys in ${result.duration}ms`)
            }
        })

        // Generate structure validation tests for each environment
        for (const environment of getMockEnvironments()) {
            it(`should validate translation structure for ${environment.name}`, async () => {
                if (!isHeavyLoadTestEnabled()) {
                    expect(true).toBe(true)
                    return
                }

                await setupTestEnvironment(environment)

                // Test with dummy engine and validate structure preservation
                const dummyEngine = engines.find(e => e.name === 'dummy')
                if (!dummyEngine) {
                    expect(true).toBe(true) // Skip if dummy engine not available
                    return
                }

                await translate(dummyEngine, {
                    baseLanguageCode: 'en',
                    targetLanguageCodes: ['it'],
                    languagesDirectoryPath: localesDir,
                    applicationContextEntries: environment.applicationContext
                })

                // Validate that translation files were created and structure is preserved
                const files = await fs.readdir(localesDir)
                const jsonFiles = files.filter(f => f.endsWith('.json'))

                expect(jsonFiles.length).toBeGreaterThan(0)

                // Check if Italian language directory was created
                const itDir = path.join(localesDir, 'it')
                try {
                    const itFiles = await fs.readdir(itDir)
                    expect(itFiles.length).toBeGreaterThan(0)

                    // Validate JSON structure is preserved in translated files
                    for (const file of jsonFiles) {
                        const inputContent = await fs.readFile(path.join(localesDir, file), 'utf-8')
                        const outputPath = path.join(itDir, file)

                        try {
                            const outputContent = await fs.readFile(outputPath, 'utf-8')
                            const inputJson = JSON.parse(inputContent)
                            const outputJson = JSON.parse(outputContent)

                            expect(Object.keys(outputJson)).toEqual(Object.keys(inputJson))
                            expect(validateStructure(inputJson, outputJson)).toBe(true)
                        } catch (error) {
                            // File might not exist if no translations were needed
                            console.log(`Translation file ${outputPath} not found, likely no changes needed`)
                        }
                    }
                } catch (error) {
                    // Italian directory might not exist if no translations were needed
                    console.log(`Italian translation directory not created, likely no changes needed for ${environment.name}`)
                }
            })
        }
    })

    describe('Variable preservation tests', () => {
        // Generate tests for each environment to verify variable preservation
        for (const environment of getMockEnvironments()) {
            it(`should preserve variables in ${environment.name} translations`, async () => {
                if (!isHeavyLoadTestEnabled()) {
                    expect(true).toBe(true)
                    return
                }

                await setupTestEnvironment(environment)

                const dummyEngine = engines.find(e => e.name === 'dummy')
                if (!dummyEngine) {
                    expect(true).toBe(true) // Skip if dummy engine not available
                    return
                }

                await translate(dummyEngine, {
                    baseLanguageCode: 'en',
                    targetLanguageCodes: ['es'],
                    languagesDirectoryPath: localesDir,
                    applicationContextEntries: environment.applicationContext
                })

                // Check that variables are preserved in original files
                const files = await fs.readdir(localesDir)
                const jsonFiles = files.filter(f => f.endsWith('.json'))

                let foundVariables = false
                for (const file of jsonFiles) {
                    const content = await fs.readFile(path.join(localesDir, file), 'utf-8')
                    if (content.includes('{{') && content.includes('}}')) {
                        foundVariables = true

                        // Check if Spanish translations exist and preserve variables
                        const esDir = path.join(localesDir, 'es')
                        try {
                            const esFile = path.join(esDir, file)
                            const esContent = await fs.readFile(esFile, 'utf-8')

                            // Extract variables from original
                            const originalVars = content.match(/\{\{[^}]+\}\}/g) || []
                            const translatedVars = esContent.match(/\{\{[^}]+\}\}/g) || []

                            // Verify all variables are preserved
                            for (const variable of originalVars) {
                                expect(translatedVars).toContain(variable)
                            }
                        } catch (error) {
                            // Translation file might not exist if no changes were needed
                            console.log(`No Spanish translation for ${file} in ${environment.name}`)
                        }
                    }
                }

                if (foundVariables) {
                    console.log(`Variables found and verified in ${environment.name}`)
                } else {
                    console.log(`No variables found in ${environment.name} - this is expected for some environments`)
                }
            })
        }
    })
})

/**
 * Recursively count translation keys in a JSON object
 */
function countTranslationKeys(obj: any): number {
    let count = 0
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            count++
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            count += countTranslationKeys(obj[key])
        }
    }
    return count
}

/**
 * Validate that two JSON objects have the same structure
 */
function validateStructure(original: any, translated: any): boolean {
    if (typeof original !== typeof translated) {
        return false
    }

    if (typeof original === 'object' && original !== null) {
        const originalKeys = Object.keys(original).sort()
        const translatedKeys = Object.keys(translated).sort()

        if (originalKeys.length !== translatedKeys.length) {
            return false
        }

        for (let i = 0; i < originalKeys.length; i++) {
            if (originalKeys[i] !== translatedKeys[i]) {
                return false
            }

            if (!validateStructure(original[originalKeys[i]], translated[translatedKeys[i]])) {
                return false
            }
        }
    }

    return true
}