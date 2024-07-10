import { UID } from "@strapi/types";

type Statistic = number;
type Statistics = { [name: string]: Statistic };

interface StatisticProvider {
  name: string;
  resolve(): Promise<Statistic>;
}

const providers: Map<string, StatisticProvider> = new Map();

export function registerStatisticsProvider(provider: StatisticProvider): void {
  if (providers.has(provider.name)) {
    throw new Error(`Provider with name ${provider.name} already exists`);
  }

  providers.set(provider.name, provider);
}

export async function getStatistics(): Promise<Statistics> {
  const statistics: Statistics = {};

  const results = Array.from(providers.values()).map((provider) => {

    const now = Date.now();
    return provider.resolve().then((result) => {
      statistics[provider.name] = result;
      strapi.log.debug(`Resolved dashboard statistic ${provider.name} in ${Date.now() - now}ms`);
    });
  });

  await Promise.all(results);

  return statistics;
}

const defaultProviders: {[name: string]: () => Promise<number>} = {
  async admin_users() {
    return strapi.query('admin::user').count();
  },
  async contentTypes() {
    return Object.keys(strapi.contentTypes).filter((type) => type.startsWith('api::')).length;
  },
  assets: count('plugin::upload.file'),
  locales: count('plugin::i18n.locale'),
  releases: count('plugin::content-releases.release'),
  apiTokens: count('admin::api-token'),
  async components() {
    return Object.entries(strapi.components).length;
  },
  async webhooks() {
    return strapi.query('strapi::webhook').count();
  },
  async entries() {
    const types = Object.keys(strapi.contentTypes).filter((type) => {
      if (type.startsWith('api::')) {
        return true;
      }

      if (type.startsWith('plugin::')) {
        // Exclude uploads, locales and releases, as they are already counted above
        return !['plugin::upload.file', 'plugin::i18n.locale', 'plugin::content-releases.release'].includes(type);
      }

      return false;
    }) as UID.CollectionType[];

    console.log({
      components : strapi.components

    });

    let result = 0;

    await Promise.all(types.map(async (contentType) => {
      const count = await strapi.documents(contentType).count();

      result += count;
    }));

    return result;
  },
};

function count(contentType: UID.CollectionType): () => Promise<number> {
  return () => strapi.documents(contentType).count();
}

Object.entries(defaultProviders).forEach(([name, resolve]) => {
  registerStatisticsProvider({ name, resolve });
});

