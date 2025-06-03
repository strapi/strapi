const prefixPluginTranslations = (trad: Record<string, string>, pluginId?: string) => {
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty");
  }

  return Object.keys(trad).reduce(
    (acc, current) => {
      acc[`${pluginId}.${current}`] = trad[current];

      return acc;
    },
    {} as Record<string, string>
  );
};

export { prefixPluginTranslations };
