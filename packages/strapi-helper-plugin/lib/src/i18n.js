/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your plugin.
 *
 */

import { defineMessages } from 'react-intl';

import enTranslationMessages from './translations/en.json'; // eslint-disable-line
import frTranslationMessages from './translations/fr.json'; // eslint-disable-line

const translationMessages = {
  en: enTranslationMessages,
  fr: frTranslationMessages,
};

const define = messages => {
  defineMessages(messages);
};



export { translationMessages, define };
