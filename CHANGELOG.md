# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.7.0] - 2025-08-XX

- "translate" function moved from index.ts to translate.ts
- Added variable consistency validation for {{ variableName }} patterns in translations
- Aggregating namespace message "Initializing empty JSON"
- Default logger name as "🌐Translate"
- Translate function, options parameter validation
- Translate tests as multiple test files"
- Added engine tests
- Counting translations keys and count of characters sent to translation 

---

## [1.6.0] - 2025-08-01

- Added comprehensive logging system with debug/verbose levels
- Added total execution time
- Added tests
- Replaced logWithColor with new logger interface

---

## [1.5.0] - 2025-07-31

- Added retry mechanism for OpenAI API calls with rate-limit handling
- OpenAI engine now automatically retries on timeouts and rate limits

---

## [1.4.0] - 2025-07-31

- Fixed cache system with better synchronization and cleaning

---

## [1.3.0] - 2025-03-25

- Added Claude translator
- LLMs now display the model they are using in brackets before performing translations

---

## [1.2.0] - 2025-03-24

### Added

- Introduced the `namesMapping` section in the configuration, allowing customization of language directory names via the `languages` field.
  - You can now rename the base language directory and target language directories.
  - Supports modifiers:
    - `{language}` – Placeholder for the language code.
    - `{language!}` – Converts the language code to uppercase.
    - `{language_}` – Converts the language code to lowercase.
- Added a `cleanup` flag in the configuration to re-enable automatic clearing of language directories.

### Changed

- Moved the cache filename configuration to the `namesMapping` section.
- Translation process no longer clears language directories by default.
- Now validating that an `apiKey` is provided when creating engines.
- The Dummy engine now supports a configurable format for generated dummy translations instead of a fixed prefix.

### Removed

- Removed `baseLanguageCodePrefixWithDot` from the configuration.

---

## [1.1.2] - 2025-03-23

### Changed

- Changed directory name engines/mt -> engines/ml. Machine (Translate -> Learning)

---

## [1.1.1] - 2025-03-23

### Changed
- **Restructured engine files** to separate them into two distinct categories: **LLM (Large Language Models)**
  and **ML (Machine Learning/Traditional)** for better clarity.
- Added **placeholder files** for potential future translators to streamline future implementations.

---

## [1.1.0] - 2025-03-23

### Added
- Integrated **DeepL translator** for enhanced translation capabilities.
- Introduced **dirty flags for namespaces**, ensuring only modified namespaces are saved.
- Implemented **log aggregation** for multiple languages within a single namespace to reduce console clutter.cd 

---

## [1.0.0] - 2025-03-23

### Added
- Added support for **namespace-specific translations** in JSON format, including nested object keys.
- Implemented a **differential translation mechanism**:
  - Translations are only updated when:
    - A translation is missing or removed in the target language (`engine.translateMissing`).
    - A new language is added to the list of target languages (`engine.translateMissing`).
    - A new translation is added or modified in the base language (`engine.translate`).
- Introduced a **translation engine/provider system**:
  - Engines are validated to ensure they provide the required translations.
  - Engines accept source and target languages, enabling translations between any language pair.
- Added **OpenAI translator**:
  - Operates on structured outputs with chunking for handling large datasets.
  - Supports parallel processing of translation requests for efficiency.
  - Utilizes key names and overall context for improved translation accuracy.
  - Allows passing application context/description to enhance translation quality.
- Added **translation directory cleanup**:
  - Deletes directories/languages not included in target languages, not part of the base language, or not translation cache files.
  - Deletes files in target languages that do not correspond to namespace files in the base language.
  - Removes outdated keys in translated languages.
