import type {
  ContentManagerTradKey,
  ContentManagerMessageId,
} from '../translations/keys.generated';

type TradOptions = Record<string, string>;

const prefixPluginTranslations = (trad: TradOptions, pluginId: string): TradOptions => {
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty");
  }
  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];
    return acc;
  }, {} as TradOptions);
};

function getTranslation(id: ContentManagerTradKey): ContentManagerMessageId;
function getTranslation(id: string): string;
function getTranslation(id: string) {
  return `content-manager.${id}`;
}

export { getTranslation, prefixPluginTranslations };
