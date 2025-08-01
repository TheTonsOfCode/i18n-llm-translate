# i18n-llm-translate


### Compare Engines

- Claude Sonnet 3.7, translates whole namespace file, so it can be most accurate, but sloooow, check for pricing 
    - maybe implement chunking
- OpenAI is fastest LLM implementation here, with good context is like 99% on point
- DeepL is like 70% on point
- Google Translate provides good quality translations with wide language support

### Mapping Languages
{language}
{!language}
{_language}

### Engines

#### Engine type
- llm (Large Language Model)
- ml (Machine Learning) - traditional translate api like DeepL, Google Translate

### Logging System

The library includes a logging system with support for different log levels, colors, and engine-specific prefixes.

#### Basic Usage
```javascript
const { translate } = require('i18n-llm-translate');

await translate(engine, {
    // ... other options
    debug: true,    // Enable debug logs
    verbose: true   // Enable verbose logs
});
```

#### Custom Logger
```javascript
const { DefaultLogger } = require('i18n-llm-translate/logger');

const customLogger = new DefaultLogger({
    debug: true,
    verbose: true,
    prefix: '🔧 My Translation Tool',
    enableColors: true
});

await translate(engine, {
    // ... other options
    logger: customLogger
});
```
