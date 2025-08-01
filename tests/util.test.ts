import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  flattenObject,
  unflattenObject,
  formatLanguageContainerDirectoryName,
  clearNullsFromResult,
  countTranslatedKeys,
  logWithColor
} from '$/util'
import { TranslateOptions, TranslateEngineTranslateResult } from '$/type'

describe('Util functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })
  describe('flattenObject', () => {
    it('should flatten nested object correctly', () => {
      const input = {
        user: {
          name: 'John',
          profile: {
            age: 30,
            city: 'Warsaw'
          }
        },
        app: {
          title: 'My App'
        }
      }

      const expected = {
        'user.name': 'John',
        'user.profile.age': '30',
        'user.profile.city': 'Warsaw',
        'app.title': 'My App'
      }

      expect(flattenObject(input)).toEqual(expected)
    })

    it('should handle empty object', () => {
      expect(flattenObject({})).toEqual({})
    })

    it('should handle flat object', () => {
      const input = { name: 'John', age: 30 }
      const expected = { name: 'John', age: '30' }
      expect(flattenObject(input)).toEqual(expected)
    })
  })

  describe('unflattenObject', () => {
    it('should unflatten object correctly', () => {
      const input = {
        'user.name': 'John',
        'user.profile.age': '30',
        'user.profile.city': 'Warsaw',
        'app.title': 'My App'
      }

      const expected = {
        user: {
          name: 'John',
          profile: {
            age: '30',
            city: 'Warsaw'
          }
        },
        app: {
          title: 'My App'
        }
      }

      expect(unflattenObject(input)).toEqual(expected)
    })

    it('should handle empty object', () => {
      expect(unflattenObject({})).toEqual({})
    })
  })

  describe('formatLanguageContainerDirectoryName', () => {
    it('should return language code when no mapping provided', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: []
      }

      expect(formatLanguageContainerDirectoryName('pl', options)).toBe('pl')
    })

    it('should return language code when no languages mapping provided', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {}
      }

      expect(formatLanguageContainerDirectoryName('pl', options)).toBe('pl')
    })
  })

  describe('clearNullsFromResult', () => {
    it('should remove null and undefined values', () => {
      const input: TranslateEngineTranslateResult = {
        pl: {
          user: {
            name: 'Jan',
            age: null,
            city: undefined
          },
          app: null
        },
        de: {
          user: {
            name: 'Hans'
          }
        }
      }

      const expected: TranslateEngineTranslateResult = {
        pl: {
          user: {
            name: 'Jan'
          }
        },
        de: {
          user: {
            name: 'Hans'
          }
        }
      }

      expect(clearNullsFromResult(input)).toEqual(expected)
    })

    it('should handle empty result', () => {
      expect(clearNullsFromResult({})).toEqual({})
    })
  })

  describe('countTranslatedKeys', () => {
    it('should count translation keys correctly', () => {
      const input: TranslateEngineTranslateResult = {
        pl: {
          user: {
            name: 'Jan',
            profile: {
              age: '30',
              city: 'Warszawa'
            }
          },
          app: {
            title: 'Moja Aplikacja'
          }
        },
        de: {
          user: {
            name: 'Hans'
          }
        }
      }

      // pl: 4 keys (name, age, city, title) + de: 1 key (name) = 5 total
      expect(countTranslatedKeys(input)).toBe(5)
    })

    it('should return 0 for empty result', () => {
      expect(countTranslatedKeys({})).toBe(0)
    })

    it('should handle nested empty objects', () => {
      const input: TranslateEngineTranslateResult = {
        pl: {},
        de: {
          user: {}
        }
      }

      expect(countTranslatedKeys(input)).toBe(0)
    })

    it('should handle null and undefined values', () => {
      const input: TranslateEngineTranslateResult = {
        pl: {
          user: null,
          app: undefined
        }
      }

      expect(countTranslatedKeys(input)).toBe(0)
    })

    it('should handle mixed types correctly', () => {
      const input: TranslateEngineTranslateResult = {
        pl: {
          stringValue: 'test',
          numberValue: 123,
          booleanValue: true,
          nullValue: null,
          undefinedValue: undefined,
          nested: {
            innerString: 'inner'
          }
        }
      }

      // Only string values should be counted: stringValue, innerString = 2
      expect(countTranslatedKeys(input)).toBe(2)
    })

    it('should handle deeply nested structures', () => {
      const input: TranslateEngineTranslateResult = {
        pl: {
          level1: {
            level2: {
              level3: {
                level4: {
                  deepValue: 'deep'
                }
              }
            }
          }
        }
      }

      expect(countTranslatedKeys(input)).toBe(1)
    })
  })

  describe('logWithColor', () => {
    it('should log with red color', () => {
      logWithColor('red', 'Error message', 'additional', 'args')
      
      expect(console.log).toHaveBeenCalledWith(
        '\x1b[31m%s\x1b[0m',
        'Error message',
        'additional',
        'args'
      )
    })

    it('should log with green color', () => {
      logWithColor('green', 'Success message')
      
      expect(console.log).toHaveBeenCalledWith(
        '\x1b[32m%s\x1b[0m',
        'Success message'
      )
    })

    it('should log with yellow color', () => {
      logWithColor('yellow', 'Warning message')
      
      expect(console.log).toHaveBeenCalledWith(
        '\x1b[33m%s\x1b[0m',
        'Warning message'
      )
    })

    it('should handle invalid color with reset code', () => {
      // @ts-expect-error Testing invalid color
      logWithColor('invalid', 'Test message')
      
      expect(console.log).toHaveBeenCalledWith(
        '\x1b[0m%s\x1b[0m',
        'Test message'
      )
    })

    it('should handle multiple additional messages', () => {
      const obj = { key: 'value' }
      const arr = [1, 2, 3]
      
      logWithColor('red', 'Main message', obj, arr, 'string')
      
      expect(console.log).toHaveBeenCalledWith(
        '\x1b[31m%s\x1b[0m',
        'Main message',
        obj,
        arr,
        'string'
      )
    })
  })

  describe('formatLanguageContainerDirectoryName', () => {
    it('should handle function-based language mapping', () => {
      const mockFunction = vi.fn().mockReturnValue('custom-pl')
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {
          languages: mockFunction
        }
      }

      const result = formatLanguageContainerDirectoryName('pl', options)
      
      expect(result).toBe('custom-pl')
      expect(mockFunction).toHaveBeenCalledWith('pl', options)
    })

    it('should handle base language with custom format', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {
          languages: {
            base: 'base-{language}',
            targets: 'target-{language}'
          }
        }
      }

      const result = formatLanguageContainerDirectoryName('en', options)
      
      expect(result).toBe('base-en')
    })

    it('should handle target language with custom format', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {
          languages: {
            base: 'base-{language}',
            targets: 'target-{language}'
          }
        }
      }

      const result = formatLanguageContainerDirectoryName('pl', options)
      
      expect(result).toBe('target-pl')
    })

    it('should handle uppercase language format', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {
          languages: {
            targets: '{language!}'
          }
        }
      }

      const result = formatLanguageContainerDirectoryName('pl', options)
      
      expect(result).toBe('PL')
    })

    it('should handle lowercase language format', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {
          languages: {
            targets: '{language_}'
          }
        }
      }

      const result = formatLanguageContainerDirectoryName('PL', options)
      
      expect(result).toBe('pl')
    })

    it('should throw error for invalid format without placeholder', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {
          languages: {
            targets: 'invalid-format'
          }
        }
      }

      expect(() => formatLanguageContainerDirectoryName('pl', options))
        .toThrow('Invalid format: "invalid-format". Expected a placeholder like "{language}", but none was found.')
    })

    it('should throw error for placeholder without language', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {
          languages: {
            targets: '{invalid}'
          }
        }
      }

      expect(() => formatLanguageContainerDirectoryName('pl', options))
        .toThrow('Invalid format: "{invalid}". Found placeholder "{invalid}", but it does not contain "language".')
    })

    it('should fallback to language code when base format not provided', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {
          languages: {
            targets: 'target-{language}'
          }
        }
      }

      const result = formatLanguageContainerDirectoryName('en', options)
      
      expect(result).toBe('en')
    })

    it('should fallback to language code when targets format not provided', () => {
      const options: TranslateOptions = {
        languagesDirectoryPath: '/path',
        baseLanguageCode: 'en',
        targetLanguageCodes: ['pl', 'de'],
        applicationContextEntries: [],
        namesMapping: {
          languages: {
            base: 'base-{language}'
          }
        }
      }

      const result = formatLanguageContainerDirectoryName('pl', options)
      
      expect(result).toBe('pl')
    })
  })

  describe('flattenObject - edge cases', () => {
    it('should handle arrays in object', () => {
      const input = {
        user: {
          hobbies: ['reading', 'coding'],
          name: 'John'
        }
      }

      const result = flattenObject(input)
      
      // Arrays are treated as objects, so they get flattened by index
      expect(result['user.hobbies.0']).toBe('reading')
      expect(result['user.hobbies.1']).toBe('coding')
      expect(result['user.name']).toBe('John')
    })

    it('should handle null values', () => {
      const input = {
        user: {
          name: 'John',
          age: null
        }
      }

      const result = flattenObject(input)
      
      expect(result['user.name']).toBe('John')
      expect(result['user.age']).toBe('null')
    })

    it('should handle undefined values', () => {
      const input = {
        user: {
          name: 'John',
          age: undefined
        }
      }

      const result = flattenObject(input)
      
      expect(result['user.name']).toBe('John')
      expect(result['user.age']).toBe('undefined')
    })

    it('should handle boolean values', () => {
      const input = {
        user: {
          isActive: true,
          isAdmin: false
        }
      }

      const result = flattenObject(input)
      
      expect(result['user.isActive']).toBe('true')
      expect(result['user.isAdmin']).toBe('false')
    })

    it('should handle number values', () => {
      const input = {
        user: {
          age: 30,
          score: 95.5
        }
      }

      const result = flattenObject(input)
      
      expect(result['user.age']).toBe('30')
      expect(result['user.score']).toBe('95.5')
    })

    it('should handle deeply nested objects', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep'
              }
            }
          }
        }
      }

      const result = flattenObject(input)
      
      expect(result['level1.level2.level3.level4.value']).toBe('deep')
    })
  })

  describe('unflattenObject - edge cases', () => {
    it('should handle single level keys', () => {
      const input = {
        name: 'John',
        age: '30'
      }

      const result = unflattenObject(input)
      
      expect(result).toEqual({
        name: 'John',
        age: '30'
      })
    })

    it('should handle keys with multiple dots', () => {
      const input = {
        'user.profile.personal.name': 'John',
        'user.profile.personal.age': '30',
        'user.settings.theme': 'dark'
      }

      const result = unflattenObject(input)
      
      expect(result).toEqual({
        user: {
          profile: {
            personal: {
              name: 'John',
              age: '30'
            }
          },
          settings: {
            theme: 'dark'
          }
        }
      })
    })

    it('should handle overlapping paths', () => {
      const input = {
        'user.name': 'John',
        'user.profile.age': '30'
      }

      const result = unflattenObject(input)
      
      expect(result).toEqual({
        user: {
          name: 'John',
          profile: {
            age: '30'
          }
        }
      })
    })

    it('should handle keys with empty string values', () => {
      const input = {
        'user.name': '',
        'user.age': '30'
      }

      const result = unflattenObject(input)
      
      expect(result).toEqual({
        user: {
          name: '',
          age: '30'
        }
      })
    })
  })

  describe('clearNullsFromResult - edge cases', () => {
    it('should handle arrays in result', () => {
      const input: TranslateEngineTranslateResult = {
        pl: {
          items: ['item1', 'item2'],
          nullArray: null
        }
      }

      const result = clearNullsFromResult(input)
      
      expect(result).toEqual({
        pl: {
          items: ['item1', 'item2']
        }
      })
    })

    it('should handle mixed nested structures', () => {
      const input: TranslateEngineTranslateResult = {
        pl: {
          valid: {
            nested: {
              value: 'test'
            }
          },
          invalid: {
            nested: {
              value: null
            }
          },
          empty: {}
        }
      }

      const result = clearNullsFromResult(input)
      
      expect(result).toEqual({
        pl: {
          valid: {
            nested: {
              value: 'test'
            }
          }
        }
      })
    })

    it('should handle completely null language', () => {
      const input: TranslateEngineTranslateResult = {
        pl: null as any,
        de: {
          user: {
            name: 'Hans'
          }
        }
      }

      const result = clearNullsFromResult(input)
      
      expect(result).toEqual({
        de: {
          user: {
            name: 'Hans'
          }
        }
      })
    })

    it('should handle result with all null values', () => {
      const input: TranslateEngineTranslateResult = {
        pl: null as any,
        de: {
          user: null
        },
        fr: {
          app: {
            title: null
          }
        }
      }

      const result = clearNullsFromResult(input)
      
      expect(result).toEqual({})
    })

    it('should preserve zero and false values', () => {
      const input: TranslateEngineTranslateResult = {
        pl: {
          count: 0,
          isActive: false,
          empty: '',
          nullValue: null
        }
      }

      const result = clearNullsFromResult(input)
      
      expect(result).toEqual({
        pl: {
          count: 0,
          isActive: false,
          empty: ''
        }
      })
    })
  })
})