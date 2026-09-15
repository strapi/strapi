/**
 * Namespaces a translation file so its keys cannot collide with the admin's own
 * or another plugin's.
 */
export const prefixPluginTranslations = (
  translation: Record<string, string>,
  pluginId: string
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(translation).map(([key, value]) => [`${pluginId}.${key}`, value])
  );
