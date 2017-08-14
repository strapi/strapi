/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your plugin.
 *
 */

import { reduce } from 'lodash';

import enTranslationMessages from 'translations/en.json'; // eslint-disable-line
import frTranslationMessages from 'translations/fr.json'; // eslint-disable-line

import { pluginId } from 'app';

const formatMessages = messages => reduce(messages, (result, value, key) => {
  const obj = result;
  obj[`${pluginId}.${key}`] = value;
  return obj;
}, {});

const translationMessages = {
  en: formatMessages(enTranslationMessages),
  fr: formatMessages(frTranslationMessages),
};

export { translationMessages };
