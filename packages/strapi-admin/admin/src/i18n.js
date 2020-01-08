/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your plugin.
 *
 */

import { addLocaleData } from 'react-intl';
import { reduce } from 'lodash';

// We need to manually import the locales here
// because dynamic imports causes webpack to build all the locales
// see https://github.com/yahoo/react-intl/issues/1225
import ar from 'react-intl/locale-data/ar';
import cs from 'react-intl/locale-data/cs';
import de from 'react-intl/locale-data/de';
import en from 'react-intl/locale-data/en';
import es from 'react-intl/locale-data/es';
import fr from 'react-intl/locale-data/fr';
import it from 'react-intl/locale-data/it';
import ja from 'react-intl/locale-data/ja';
import ko from 'react-intl/locale-data/ko';
import nl from 'react-intl/locale-data/nl';
import pl from 'react-intl/locale-data/pl';
import pt from 'react-intl/locale-data/pt';
import ru from 'react-intl/locale-data/ru';
import tr from 'react-intl/locale-data/tr';
import vi from 'react-intl/locale-data/vi';
import zh from 'react-intl/locale-data/zh';
import sk from 'react-intl/locale-data/sk';

import trads from './translations';

// We dismiss pt-BR and zh-Hans locales since they are not supported by react-intl
const locales = {
  ar,
  cs,
  de,
  en,
  es,
  fr,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  ru,
  tr,
  vi,
  zh,
  sk,
};
const languages = Object.keys(trads);

/**
 * Dynamically generate `translationsMessages object`.
 */
const translationMessages = reduce(
  languages,
  (result, language) => {
    const obj = result;
    obj[language] = trads[language];

    if (locales[language]) {
      addLocaleData(locales[language]);
    }

    return obj;
  },
  {}
);

export { languages, translationMessages };
