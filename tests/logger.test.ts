import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DefaultTranslateLogger } from '$/logger'

describe('DefaultLogger', () => {
  let consoleSpy: any

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('basic logging methods', () => {
    it('should log info messages', () => {
      const logger = new DefaultTranslateLogger()
      logger.info('Test info message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[INFO]')
      expect(call).toContain('Test info message')
    })

    it('should log error messages', () => {
      const logger = new DefaultTranslateLogger()
      logger.error('Test error message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[ERROR]')
      expect(call).toContain('Test error message')
    })

    it('should log success messages', () => {
      const logger = new DefaultTranslateLogger()
      logger.success('Test success message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[SUCCESS]')
      expect(call).toContain('Test success message')
    })

    it('should log warning messages', () => {
      const logger = new DefaultTranslateLogger()
      logger.warn('Test warning message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[WARN]')
      expect(call).toContain('Test warning message')
    })
  })

  describe('debug and verbose logging', () => {
    it('should not log debug messages by default', () => {
      const logger = new DefaultTranslateLogger()
      logger.debug('Debug message')
      
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log debug messages when debug is enabled', () => {
      const logger = new DefaultTranslateLogger({ debug: true })
      logger.debug('Debug message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[DEBUG]')
      expect(call).toContain('Debug message')
    })

    it('should not log verbose messages by default', () => {
      const logger = new DefaultTranslateLogger()
      logger.verbose('Verbose message')
      
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log verbose messages when verbose is enabled', () => {
      const logger = new DefaultTranslateLogger({ verbose: true })
      logger.verbose('Verbose message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[VERBOSE]')
      expect(call).toContain('Verbose message')
    })
  })

  describe('engine-specific logging', () => {
    it('should log engine messages with engine prefix', () => {
      const logger = new DefaultTranslateLogger()
      logger.engineLog('OpenAI', 'Engine message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[OpenAI]')
      expect(call).toContain('[INFO]')
      expect(call).toContain('Engine message')
    })

    it('should log engine debug messages when debug is enabled', () => {
      const logger = new DefaultTranslateLogger({ debug: true })
      logger.engineDebug('OpenAI', 'Engine debug message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[OpenAI]')
      expect(call).toContain('[DEBUG]')
      expect(call).toContain('Engine debug message')
    })

    it('should not log engine debug messages when debug is disabled', () => {
      const logger = new DefaultTranslateLogger({ debug: false })
      logger.engineDebug('OpenAI', 'Engine debug message')
      
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log engine verbose messages when verbose is enabled', () => {
      const logger = new DefaultTranslateLogger({ verbose: true })
      logger.engineVerbose('OpenAI', 'Engine verbose message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[OpenAI]')
      expect(call).toContain('[VERBOSE]')
      expect(call).toContain('Engine verbose message')
    })
  })

  describe('configuration methods', () => {
    it('should enable debug logging via setDebug', () => {
      const logger = new DefaultTranslateLogger({ debug: false })
      logger.setDebug(true)
      logger.debug('Debug message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[DEBUG]')
      expect(call).toContain('Debug message')
    })

    it('should enable verbose logging via setVerbose', () => {
      const logger = new DefaultTranslateLogger({ verbose: false })
      logger.setVerbose(true)
      logger.verbose('Verbose message')
      
      const call = consoleSpy.mock.calls[0][0]
      expect(call).toContain('[VERBOSE]')
      expect(call).toContain('Verbose message')
    })
  })

  describe('custom prefix and colors', () => {
    it('should use custom prefix', () => {
      const logger = new DefaultTranslateLogger({ prefix: '🔧 custom-tool' })
      logger.info('Test message')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔧 custom-tool')
      )
    })

    it('should disable colors when enableColors is false', () => {
      const logger = new DefaultTranslateLogger({ enableColors: false })
      logger.info('Test message')
      
      const call = consoleSpy.mock.calls[0][0]
      // When colors are disabled, there should be no ANSI escape codes
      expect(call).not.toMatch(/\x1b\[[0-9;]*m/)
    })
  })

  describe('message formatting', () => {
    it('should include timestamp in messages', () => {
      const logger = new DefaultTranslateLogger()
      logger.info('Test message')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\]/)
      )
    })

    it('should include default prefix in messages', () => {
      const logger = new DefaultTranslateLogger()
      logger.info('Test message')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🌐Translate')
      )
    })
  })
})