type Translations = {
  [key: string]: string;
};

export const prefixPluginTranslations = (trad: Translations, pluginId?: string) => {
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty");
  }

  return Object.keys(trad).reduce((acc: Translations, current: string) => {
    acc[`${pluginId}.${current}`] = trad[current];

    return acc;
  }, {});
};
