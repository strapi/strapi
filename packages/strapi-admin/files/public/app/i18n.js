/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your plugin.
 *
 */

import { addLocaleData } from 'react-intl';
import { reduce } from 'lodash';

// Import config
import { languages } from '../../config/admin.json';

/**
 * Try to require translation file.
 *
 * @param language {String}
 */
const requireTranslations = async language => {
  try {
    return await System.import(`./translations/${language}.json`);
  } catch (error) {
    console.error(`Unable to load "${language}" translation. Please make sure "${language}.json" file exists in "admin/public/app/translations" folder.`);
    return false;
  }
};

/**
 * Try to require the language in `react-intl` locale data
 * and add locale data if it has been found.
 *
 * @param language {String}
 */
const addLanguageLocaleData = async language => {
  try {
    const localeData = await System.import(`react-intl/locale-data/${language}`);
    addLocaleData(localeData);
    return true;
  } catch (error) {
    console.error(`It looks like the language "${language}" is not supported by "react-intl" module.`);
    return false;
  }
};

/**
 * Dynamically generate `translationsMessages object`.
 */
const translationMessages = reduce(languages, (result, language) => {
  const obj = result;
  obj[language] = requireTranslations(language);
  addLanguageLocaleData(language);
  return obj;
}, {});

export {
  languages,
  translationMessages,
};
