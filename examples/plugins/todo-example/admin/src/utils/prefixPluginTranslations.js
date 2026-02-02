/**
 * @typedef {Object.<string, string>} TradOptions
 */

/**
 * Prefixes the keys of the translation object with the plugin ID.
 *
 * @param {TradOptions} trad - The translation object.
 * @param {string} pluginId - The plugin ID to prefix.
 * @returns {TradOptions} - The new translation object with prefixed keys.
 * @throws {TypeError} - If the pluginId is empty.
 */
export function prefixPluginTranslations(trad, pluginId) {
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty");
  }

  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];

    return acc;
  }, {});
}
