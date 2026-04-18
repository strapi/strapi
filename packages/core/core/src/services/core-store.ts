import { toString } from 'lodash/fp';
import type { Database, Model } from '@strapi/database';

const coreStoreModel: Model = {
  uid: 'strapi::core-store',
  singularName: 'strapi_core_store_settings',
  tableName: 'strapi_core_store_settings',
  attributes: {
    id: {
      type: 'increments',
    },
    key: {
      type: 'string',
    },
    value: {
      type: 'text',
    },
    type: {
      type: 'string',
    },
    environment: {
      type: 'string',
    },
    tag: {
      type: 'string',
    },
  },
};

type SetParams = {
  key: string;
  value: unknown;
  type?: string;
  environment?: string;
  name?: string;
  tag?: string;
};

type GetParams = {
  key: string;
  type?: string;
  environment?: string;
  name?: string;
  tag?: string;
};

type Params = SetParams & GetParams;

interface CoreStore {
  (defaultParams: Partial<Params>): {
    get<T = unknown>(params: Partial<GetParams>): Promise<T>;
    set(params: Partial<SetParams>): Promise<void>;
    delete(params: Partial<GetParams>): Promise<void>;
  };
  get<T = unknown>(params: GetParams): Promise<T>;
  set(params: SetParams): Promise<void>;
  delete(params: GetParams): Promise<void>;
  prefill(): Promise<void>;
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes — only used during startup

const createCoreStore = ({ db }: { db: Database }) => {
  // Populated by prefill(), auto-expires after CACHE_TTL
  const cache = new Map<string, { value: string; type: string; id: number }>();

  const cacheKey = (key: string, environment: string | null, tag: string | null) =>
    `${key}\0${environment ?? ''}\0${tag ?? ''}`;

  const mergeParams = (defaultParams: Partial<Params>, params: Params): Params => {
    return {
      ...defaultParams,
      ...params,
    };
  };

  const parseValue = (data: { value: string; type: string }) => {
    if (
      data.type === 'object' ||
      data.type === 'array' ||
      data.type === 'boolean' ||
      data.type === 'string'
    ) {
      try {
        return JSON.parse(data.value);
      } catch (err) {
        return new Date(data.value);
      }
    } else if (data.type === 'number') {
      return Number(data.value);
    } else {
      return null;
    }
  };

  const store: CoreStore = function (defaultParams: Partial<Params>) {
    return {
      get: (params: Params) => store.get(mergeParams(defaultParams, params)),
      set: (params: Params) => store.set(mergeParams(defaultParams, params)),
      delete: (params: Params) => store.delete(mergeParams(defaultParams, params)),
    };
  };

  /**
   * Bulk-load all rows into cache. Call once early in bootstrap to avoid
   * N individual SELECT round-trips to the database.
   *
   * Cache entries auto-expire after CACHE_TTL since this is only meant to save
   * queries during startup
   */
  store.prefill = async () => {
    try {
      const rows = await db.query('strapi::core-store').findMany({});
      cache.clear();

      for (const row of rows) {
        const ck = cacheKey(row.key, row.environment ?? null, row.tag ?? null);
        cache.set(ck, { value: row.value, type: row.type, id: row.id });
      }

      // Auto-expire cache after TTL — it's only meant for startup
      setTimeout(() => {
        cache.clear();
      }, CACHE_TTL).unref();
    } catch {
      // Table may not exist on first run — that's fine, cache stays empty
    }
  };

  /**
   * Get value from the core store
   */
  store.get = async (params) => {
    const { key, type = 'core', environment, name, tag } = params;

    const prefix = `${type}${name ? `_${name}` : ''}`;
    const fullKey = `${prefix}_${key}`;
    const env = environment || null;
    const t = tag || null;
    const cached = cache.get(cacheKey(fullKey, env, t));

    // Serve from cache when available
    if (cached) {
      return parseValue(cached);
    }

    const where = { key: fullKey, environment: env, tag: t };
    const data = await db.query('strapi::core-store').findOne({ where });

    if (!data) {
      return null;
    }

    return parseValue(data);
  };

  /**
   * Set value in the core store
   * @param {Object} params
   * @returns {*}
   */
  store.set = async (params) => {
    const { key, value, type, environment, name, tag } = params;

    const prefix = `${type}${name ? `_${name}` : ''}`;

    cache.delete(cacheKey(`${prefix}_${key}`, environment || null, tag || null));

    const where = {
      key: `${prefix}_${key}`,
      environment: environment || null,
      tag: tag || null,
    };

    const data = await db.query('strapi::core-store').findOne({ where });

    if (data) {
      return db.query('strapi::core-store').update({
        where: { id: data.id },
        data: {
          value: JSON.stringify(value) || toString(value),
          type: typeof value,
        },
      });
    }

    return db.query('strapi::core-store').create({
      data: {
        ...where,
        value: JSON.stringify(value) || toString(value),
        type: typeof value,
      },
    });
  };

  /**
   * Deletes a value from the core store
   * @param {Object} params
   * @returns {*}
   */
  store.delete = async (params) => {
    const { key, environment, type, name, tag } = params;

    const prefix = `${type}${name ? `_${name}` : ''}`;
    const fullKey = `${prefix}_${key}`;
    const env = environment || null;
    const t = tag || null;
    const where = { key: fullKey, environment: env, tag: t };

    cache.delete(cacheKey(fullKey, env, t));

    return db.query('strapi::core-store').delete({ where });
  };

  return store;
};

export { coreStoreModel, createCoreStore };
