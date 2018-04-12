/**
 * i18n.js
 *
 * This will setup the i18n language files and locale data for your plugin.
 *
 */

/* eslint-disable no-console */
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
  result[`${pluginId}.${key}`] = value;

  return result;
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
    return;
  }
};

/**
 * Dynamically generate `translationsMessages object`.
 */

const translationMessages = reduce(strapi.languages, (result, language) => {
  result[language] = formatMessages(requireTranslations(language));

  return result;
}, {});

export { translationMessages };
