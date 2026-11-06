'use strict';

/**
 * Deterministic stand-in for an AI translations provider: every translatable string becomes
 * `[<locale>] <string>`. Calls are recorded so tests can assert what the CMS sent.
 *
 * Structure is kept as is, as a real provider must keep it, because the i18n localization merge
 * prefers the provider output:
 * - `__component` on a dynamic zone entry is a component uid, not text;
 * - in a blocks node only `text` holds text: `type`, `url`, `level`, `format`, `language` and
 *   `image` stay untouched, and `children` are walked.
 */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const isBlocksNode = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const node = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof node.type === 'string' && ('children' in node || 'text' in node || node.type === 'image')
  );
};

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
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (isBlocksNode(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) =>
          key === 'text' || key === 'children' ? [key, translate(item, locale)] : [key, item]
        )
      );
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) =>
        key === '__component' ? [key, item] : [key, translate(item, locale)]
      )
    );
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
