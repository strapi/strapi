'use strict';

/**
 * Deterministic stand-in for an AI translations provider: every translatable string becomes
 * `[<locale>] <string>`. Calls are recorded so tests can assert what the CMS sent.
 *
 * It only translates what a real provider may change, because i18n saves the provider output
 * as is (`documents.update`), and the merge prefers it:
 * - top-level attributes follow the `contentTypeSchema` i18n sends: `string`, `text` and
 *   `richtext` values are translated, `blocks` only in their `text` leaves, `component` and
 *   `dynamiczone` recursively; `uid`, `email`, `date`, `json` and every other type stay as is;
 * - inside components, i18n sends no schema yet (TODO in i18n's ai-localizations.ts), so every
 *   string is translated except `__component` and the structural keys of blocks nodes.
 */

const TEXT_TYPES = new Set(['string', 'text', 'richtext']);

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

/** @param {string} value @param {string} locale */
const prefix = (value, locale) => `[${locale}] ${value}`;

/**
 * Translate a value without schema: every string, keeping blocks structure and `__component`.
 * @param {unknown} value @param {string} locale @returns {unknown}
 */
const translateAny = (value, locale) => {
  if (typeof value === 'string') {
    return prefix(value, locale);
  }
  if (Array.isArray(value)) {
    return value.map((item) => translateAny(item, locale));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (isBlocksNode(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) =>
        key === 'text' || key === 'children' ? [key, translateAny(item, locale)] : [key, item]
      )
    );
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) =>
      key === '__component' ? [key, item] : [key, translateAny(item, locale)]
    )
  );
};

/** @param {unknown} value @param {string | undefined} type @param {string} locale */
const translateAttribute = (value, type, locale) => {
  if (type !== undefined && TEXT_TYPES.has(type)) {
    return typeof value === 'string' ? prefix(value, locale) : value;
  }
  if (type === 'blocks' || type === 'component' || type === 'dynamiczone') {
    return translateAny(value, locale);
  }
  return value;
};

const createFakeAiTranslationsProvider = () => {
  /** @type {Array<{ sourceLocale: string, targetLocales: string[], content: unknown }>} */
  const calls = [];

  return {
    calls,
    provider: {
      name: 'tests-fake-ai',
      /**
       * @param {{
       *   sourceLocale: string,
       *   targetLocales: string[],
       *   content: Record<string, unknown>,
       *   contentTypeSchema: Record<string, { type?: string }>,
       * }} params
       */
      async generateTranslations({ sourceLocale, targetLocales, content, contentTypeSchema }) {
        calls.push({ sourceLocale, targetLocales, content });
        return {
          localizations: targetLocales.map((locale) => ({
            locale,
            content: Object.fromEntries(
              Object.entries(content).map(([key, value]) => [
                key,
                translateAttribute(value, contentTypeSchema?.[key]?.type, locale),
              ])
            ),
          })),
        };
      },
    },
  };
};

module.exports = { createFakeAiTranslationsProvider };
