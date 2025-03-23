
# TODO

Some logger? Instead of console logs...


Tests:
    - locale/ directories with dummy-engine 
    - cache tests
    - openai engine tests


Application context move to engines instead of options.
    Translators like google, or deepl do not use that


Do we even need caching other languages translations? Probably not.
    Make flag for that:
    - as default it saves only base language as a string, not a subkey
    - when true it saves all languages as it is now

Add dirty to namespaces so when just one namespace changes we do not save them all
Dirty on removed languages inside cache

Remove openapi package and just use simple fetch

Support of other translations format like:
- properties
- yaml

Support of other translations engines:
- google translate
- deepseek API / locally hosted deepseek
- deepl


Greek characters broken JSON.parse???


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
