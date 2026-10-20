'use strict';

const LOCALE_ALIASES = {
  'zh-hans': 'zh-CN',
  'zh-hant': 'zh-TW',
  zh: 'zh-CN',
  'en-gb': 'en',
  'en-us': 'en',
};

const REGIONAL_GOOGLE_LOCALES = new Set(['zh-CN', 'zh-TW', 'pt-BR', 'pt-PT']);

const toGoogleLocale = (locale) => {
  if (!locale) {
    return locale;
  }

  const lower = String(locale).toLowerCase();
  if (LOCALE_ALIASES[lower]) {
    return LOCALE_ALIASES[lower];
  }

  const parts = String(locale).split('-');
  if (parts.length >= 2) {
    const regional = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
    if (REGIONAL_GOOGLE_LOCALES.has(regional)) {
      return regional;
    }
    return parts[0].toLowerCase();
  }

  return lower;
};

module.exports = {
  toGoogleLocale,
};
