/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your plugin.
 *
 */

import { addLocaleData, defineMessages } from 'react-intl';

import enTranslationMessages from './translations/en.json';
import frTranslationMessages from './translations/fr.json';

import enLocaleData from 'react-intl/locale-data/en';
import frLocaleData from 'react-intl/locale-data/fr';


addLocaleData(enLocaleData);
addLocaleData(frLocaleData);

const appLocales = [
  'en',
  'fr',
];

const translationMessages = {
  en: enTranslationMessages,
  fr: frTranslationMessages,
};

const define = messages => {
  defineMessages(messages);
};

export {
  appLocales,
  define,
  translationMessages,
};
