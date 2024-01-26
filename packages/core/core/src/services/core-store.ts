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
    get(params: Partial<GetParams>): Promise<unknown>;
    set(params: Partial<SetParams>): Promise<void>;
    delete(params: Partial<GetParams>): Promise<void>;
  };
  get(params: GetParams): Promise<unknown>;
  set(params: SetParams): Promise<void>;
  delete(params: GetParams): Promise<void>;
}

const createCoreStore = ({ db }: { db: Database }) => {
  const mergeParams = (defaultParams: Partial<Params>, params: Params): Params => {
    return {
      ...defaultParams,
      ...params,
    };
  };

  const store: CoreStore = function (defaultParams: Partial<Params>) {
    return {
      get: (params: Params) => store.get(mergeParams(defaultParams, params)),
      set: (params: Params) => store.set(mergeParams(defaultParams, params)),
      delete: (params: Params) => store.delete(mergeParams(defaultParams, params)),
    };
  };

  /**
   * Get value from the core store
   */
  store.get = async (params) => {
    const { key, type = 'core', environment, name, tag } = params;

    const prefix = `${type}${name ? `_${name}` : ''}`;

    const where = {
      key: `${prefix}_${key}`,
      environment: environment || null,
      tag: tag || null,
    };

    const data = await db.query('strapi::core-store').findOne({ where });

    if (!data) {
      return null;
    }

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

  /**
   * Set value in the core store
   * @param {Object} params
   * @returns {*}
   */
  store.set = async (params) => {
    const { key, value, type, environment, name, tag } = params;

    const prefix = `${type}${name ? `_${name}` : ''}`;

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

    const where = {
      key: `${prefix}_${key}`,
      environment: environment || null,
      tag: tag || null,
    };

    return db.query('strapi::core-store').delete({ where });
  };

  return store;
};

export { coreStoreModel, createCoreStore };
