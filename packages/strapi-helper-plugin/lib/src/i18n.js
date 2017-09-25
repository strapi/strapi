/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your plugin.
 *
 */

import { reduce } from 'lodash';

// Plugin identifier based on the package.json `name` value
const pluginPkg = require('../../../../package.json');
const pluginId = pluginPkg.name.replace(
  /^strapi-plugin-/i,
  ''
);

/**
 * Add plugin identifier as translation message prefix,
 * in order to avoid confusion and errors when many
 * plugins are installed.
 *
 * @param messages
 */
const formatMessages = messages => reduce(messages, (result, value, key) => {
  const obj = result;
  obj[`${pluginId}.${key}`] = value;
  return obj;
}, {});

/**
 * Try to require translation file.
 *
 * @param language {String}
 */
const requireTranslations = language => {
  try {
    return require(`translations/${language}.json`); // eslint-disable-line global-require
  } catch (error) {
    console.error(`Unable to load "${language}" translation for the plugin ${pluginId}. Please make sure "${language}.json" file exists in "pluginPath/admin/src/translations" folder.`);
    return false;
  }
};

/**
 * Dynamically generate `translationsMessages object`.
 */
const translationMessages = reduce(window.Strapi.languages, (result, language) => {
  const obj = result;
  const messages = requireTranslations(language);
  obj[language] = formatMessages(messages);
  return obj;
}, {});

export { translationMessages };
