
Engine: maxRetriesOnEngineValidationError, do retries on certain engine type validation error

Walking util

Gracefully handle:
  - 401 - put some random uuid in test and check for 401 return
  - 456 (DeepL), or other code for some other providers, when we go out of funds

### Tests:
- locale/ directories with dummy-engine
- openai engine tests

### CLI ...

#### Add validate command, as DeepL, or Google can detect language, Mark translation ad validation file which are wrong and choose
    engine which will be used to fix them...

    openai sometimes puts bulgarian translations in place to polish ones

### Try enabling reasoning for LLMs and check quality of the output


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
- ✓ google translate
- deepseek API / locally hosted deepseek

### Add Counting of Total Tokens for All Translation Requests to Each Model
- Add a flag to enable statistics tracking using a `.statistics.json` file with the following structure:
  This allows users to monitor total token consumption.
- Token data should be saved in such a way that even if a translation request fails but the API fetch is successful,
  the `.statistics.json` file is still updated.
```json
{
  "tokensUsed": {
    "claude": {
      "input": 12345,
      "output": 4567
    }
  }
}
```

### Greek characters broken JSON.parse???


### Placing '!!!' (three exclamation marks) at the beginning of a value forces the regeneration of that value during the next generation cycle and removes the exclamation marks from the beginning of the value.


### Add "_engine" field to the cache, so we can regenerate specific cached fields when swapping the engine if user wants


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
