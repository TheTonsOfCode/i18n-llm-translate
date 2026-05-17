# Engine Tests

This directory contains unified tests for all translation engines across three different test levels.

## Setup

1. Copy `tests/.env.example` to `tests/.env` and fill in your API keys:
   ```bash
   cp tests/.env.example tests/.env
   ```

2. Edit `tests/.env` and add your API keys for the engines you want to test.

## Test Files

### 1. `engines.translate.test.ts`
Tests the direct `engine.translate()` method for basic translation functionality.

### 2. `engines.translate-missing.test.ts` 
Tests the `engine.translateMissed()` method for handling missing translations with different structures per language.

### 3. `engines.translate-main.test.ts`
Tests the main `translate()` function from `translate.ts` which orchestrates the entire translation process including file I/O, caching, and namespace management.

## Running Tests

### Test specific engines:
```bash
# Test only dummy engine (always available)
npm run test:engine:dummy

# Test DeepL engine
npm run test:engine:deepl

# Test OpenAI engine (default model)
npm run test:engine:openai

# Test OpenAI engine with GPT-4o
npm run test:engine:openai-4o

# Test Claude engine
npm run test:engine:claude

# Test Google Translate engine
npm run test:engine:google
```

### Test multiple engines:
```bash
# Test all available engines with API keys
npm run test:engine:all

# Test specific combination
npm run test:engines  # Tests deepl,openai,claude,google
```

### Custom engine combinations:
```bash
# Test specific engines by setting TEST_ENGINES environment variable
TEST_ENGINES=dummy,openai npm test tests/engines/
TEST_ENGINES=deepl,claude npm test tests/engines/
```

### Test specific files:
```bash
# Test only basic translate method
npm test tests/engines/engines.translate.test.ts

# Test only translateMissed method
npm test tests/engines/engines.translate-missing.test.ts

# Test only main translate function
npm test tests/engines/engines.translate-main.test.ts
```

## Engine Configuration

Engines are configured in `shared.ts` and can be enabled/disabled based on the `TEST_ENGINES` environment variable:

- `dummy` - Always available, no API key needed
- `deepl` - Requires `DEEPL_API_KEY`
- `openai` - Requires `OPENAI_API_KEY`
- `openai-4o` - Requires `OPENAI_API_KEY`, uses GPT-4o model
- `claude` - Requires `CLAUDE_API_KEY`
- `google` - Requires `GOOGLE_API_KEY`
- `*` - All available engines
