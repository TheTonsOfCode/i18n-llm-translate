
# TODO


### CLI ...


### Instead of baseLanguageCodePrefixWithDot
```json5
{
  namesMapping: {
    // Both have by default: '{language}'
    languageContainers: {
      base: '.{language}',
      translated: '{language}_generated'
    }
  }
}
```

### Consider naming
'Engine' is pretty good as it can be LLM, or some provider like DeepL,Google

maybe "provider"?

### Some logger? Instead of console logs...


### Tests:
- locale/ directories with dummy-engine 
- cache tests
- openai engine tests


### Application context move to engines instead of options.
Translators like google, or deepl do not use that


### Do we even need caching other languages translations? Probably not.
Make flag for that:
- as default it saves only base language as a string, not a subkey
- when true it saves all languages as it is now

### Dirty flags

Dirty on removed languages inside cache

### Remove openai package and just use simple fetch

### Change openai "Chunk" > "Batch"

### Support of other translations format like:
- properties
- yaml

### Support of other translations engines:
- google translate
- deepseek API / locally hosted deepseek
- deepl


### Greek characters broken JSON.parse???


### Placing '!!!' (three exclamation marks) at the beginning of a value forces the regeneration of that value during the next generation cycle and removes the exclamation marks from the beginning of the value.


### `$context` Functionality

- It is removed from the final translations.
- In translators like OpenAI, there is likely a way to specify that `$context` should be treated as additional context for the section it belongs to.

#### Example

```json
{
  "menu": {
    "$context": "Navigation labels for an e-commerce website.",
    "cart": "Basket",
    "order": "Order",
    "profile": "Account"
  },
  "company": {
    "$context": "'Acme' company name should not be translated.",
    "hi": "Hi {{user}}! Welcom to Acme!"
  }
}
