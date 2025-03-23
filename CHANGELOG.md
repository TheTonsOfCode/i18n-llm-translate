# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.1] - YYYY-MM-DD

### Changed
- **Restructured engine files** to separate them into two distinct categories: **LLM (Large Language Models)** and **MT (Machine Translation)** for better clarity.
- Added **placeholder files** for potential future translators to streamline future implementations.

---

## [1.1.0] - 2025-03-23

### Added
- Integrated **DeepL translator** for enhanced translation capabilities.
- Introduced **dirty flags for namespaces**, ensuring only modified namespaces are saved.
- Implemented **log aggregation** for multiple languages within a single namespace to reduce console clutter.

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
