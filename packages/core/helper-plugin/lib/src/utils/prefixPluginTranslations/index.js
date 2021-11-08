const prefixPluginTranslations = (trad, pluginId) => {
  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];

    return acc;
  }, {});
};

export default prefixPluginTranslations;
