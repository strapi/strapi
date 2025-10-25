import pluginId from '../pluginId';

const prefixPluginTranslations = (trad: any, pluginId: string) => {
  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];
    return acc;
  }, {} as any);
};

export default prefixPluginTranslations;

