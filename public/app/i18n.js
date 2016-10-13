/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your app.
 *
 */
import { addLocaleData } from 'react-intl';

import enLocaleData from 'react-intl/locale-data/en';
import frLocaleData from 'react-intl/locale-data/fr';

export const appLocales = [
  'en',
  'fr',
];

import enTranslationMessages from './translations/en.json';
import frTranslationMessages from './translations/fr.json';

addLocaleData(enLocaleData);
addLocaleData(frLocaleData);

const formatTranslationMessages = (messages) => {
  const formattedMessages = {};
  for (const message of messages) {
    formattedMessages[message.id] = message.message || message.defaultMessage;
  }

  return formattedMessages;
};

const translationMessages = {
  en: formatTranslationMessages(enTranslationMessages),
  fr: formatTranslationMessages(frTranslationMessages),
};

export {
  translationMessages,
};
