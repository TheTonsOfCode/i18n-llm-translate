import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getMockEngines } from '../shared'
import { TranslateEngine } from '$/type'
import * as fs from 'fs/promises'
import * as path from 'path'
import { tmpdir } from 'os'

describe('Full workspace translations', () => {
    let engines: TranslateEngine[]
    let testDir: string

    beforeEach(async () => {
        vi.clearAllMocks()
        // vi.spyOn(console, 'log').mockImplementation(() => {})
        engines = getMockEngines()

        // Set TEST_ENGINES environment variable to allow dummy engine in main translate function
        process.env.TEST_ENGINES = process.env.TEST_ENGINES || 'dummy'

        // Create temporary directory for test files
        testDir = await fs.mkdtemp(path.join(tmpdir(), 'translate-test-'))
    })

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, {recursive: true, force: true})
        } catch (error) {
            // Ignore cleanup errors
        }
    })

    // TODO:
    // TODO:
    // TODO: enabled this tests with env
    // TODO: if not enabled, then everywhere expect(true)
    // TODO:
    // TODO:

    describe('Main translate function', () => {
        it('should translate files using engine', async () => {

        })
    })
})