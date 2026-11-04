'use strict';

/**
 * Deterministic stand-in for an AI translations provider: every string becomes
 * `[<locale>] <string>`. Calls are recorded so tests can assert what the CMS sent.
 */
const createFakeAiTranslationsProvider = () => {
  /** @type {Array<{ sourceLocale: string, targetLocales: string[], content: unknown }>} */
  const calls = [];

  /** @param {unknown} value @param {string} locale @returns {unknown} */
  const translate = (value, locale) => {
    if (typeof value === 'string') {
      return `[${locale}] ${value}`;
    }
    if (Array.isArray(value)) {
      return value.map((item) => translate(item, locale));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, translate(item, locale)])
      );
    }
    return value;
  };

  return {
    calls,
    provider: {
      name: 'tests-fake-ai',
      /** @param {{ sourceLocale: string, targetLocales: string[], content: Record<string, unknown> }} params */
      async generateTranslations({ sourceLocale, targetLocales, content }) {
        calls.push({ sourceLocale, targetLocales, content });
        return {
          localizations: targetLocales.map((locale) => ({
            locale,
            content: /** @type {Record<string, unknown>} */ (translate(content, locale)),
          })),
        };
      },
    },
  };
};

module.exports = { createFakeAiTranslationsProvider };
