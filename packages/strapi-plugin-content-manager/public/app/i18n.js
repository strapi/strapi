/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your plugin.
 *
 */

import { defineMessages } from 'react-intl';

import enTranslationMessages from './translations/en.json';
import frTranslationMessages from './translations/fr.json';

const translationMessages = {
  en: enTranslationMessages,
  fr: frTranslationMessages,
};

const define = messages => {
  defineMessages(messages);
};

// Hot reloadable translation json files
if (module.hot) {
  // modules.hot.accept does not accept dynamic dependencies,
  // have to be constants at compile-time
  module.hot.accept('./i18n', () => {
    if (window.Strapi) {
      System.import('./i18n').then(result => {
        const translationMessagesUpdated = result.translationMessages;
        window.Strapi
          .refresh(pluginId)
          .translationMessages(translationMessagesUpdated);
      });
    }
  });
}

export { translationMessages, define };
