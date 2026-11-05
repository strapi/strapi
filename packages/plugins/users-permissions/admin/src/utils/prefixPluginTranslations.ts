/** Namespaces translation messages for registration in the admin. */
const prefixPluginTranslations = (trad: Record<string, string>, pluginId: string) => {
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty");
  }

  return Object.keys(trad).reduce<Record<string, string>>((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];

    return acc;
  }, {});
};

export { prefixPluginTranslations };
