import { PLUGIN_ID } from '../constants';

export const getTranslation = (id: string) => `${PLUGIN_ID}.${id}`;

export const prefixPluginTranslations = (trad: Record<string, string>, pluginId: string) => {
  return Object.keys(trad).reduce<Record<string, string>>((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];
    return acc;
  }, {});
};
