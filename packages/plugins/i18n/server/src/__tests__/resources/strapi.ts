import type { Core } from '@strapi/types';
import createPluginServer from '../../index';
import { resetStrapiBinding } from '../../utils/strapi-ref';

type UnknownRecord = Record<string, unknown>;
type Factory = (params: { strapi: Core.Strapi }) => unknown;

/**
 * The plugin entry as core calls it: `register` and `bootstrap` receive `{ strapi }`, services and
 * controllers are either plain objects or `({ strapi })` factories.
 */
export type PluginServer = {
  register: (params: { strapi: Core.Strapi }) => Promise<void>;
  bootstrap: (params: { strapi: Core.Strapi }) => Promise<void>;
  services: UnknownRecord;
  controllers: UnknownRecord;
};

export type Ctx = UnknownRecord & {
  body?: unknown;
  state: UnknownRecord;
  params: UnknownRecord;
  query: UnknownRecord;
  request: { body?: unknown; query: UnknownRecord };
  notFound: jest.Mock;
  forbidden: jest.Mock;
};

export const loadPluginServer = () => createPluginServer() as unknown as PluginServer;

/**
 * Mirrors the core registries: `typeof value === 'function' ? value({ strapi }) : value`.
 */
export const resolveWithStrapi = <T = UnknownRecord>(value: unknown, strapi: Core.Strapi): T => {
  return (typeof value === 'function' ? (value as Factory)({ strapi }) : value) as T;
};

type CreateStrapiOptions = {
  /**
   * i18n services served instead of the real ones (e.g. to isolate a dependency).
   */
  i18nServices?: UnknownRecord;
};

/**
 * Builds a strapi mock that serves the real i18n services, resolved lazily with the same mock like
 * the core service registry. The mock is assigned to `global.strapi` (develop code reads the
 * global; the unit setup adds `plugin()` and `service()` accessors) and returned so tests can also
 * pass it explicitly, the way core does.
 */
export const createStrapi = (mock: UnknownRecord, options: CreateStrapiOptions = {}) => {
  const pluginServer = loadPluginServer();
  const strapi = mock as unknown as Core.Strapi;
  const resolved = new Map<string, unknown>();
  const services: UnknownRecord = {};

  Object.keys(pluginServer.services).forEach((name) => {
    Object.defineProperty(services, name, {
      enumerable: true,
      get() {
        if (options.i18nServices !== undefined && name in options.i18nServices) {
          return options.i18nServices[name];
        }

        if (resolved.has(name) === false) {
          resolved.set(name, resolveWithStrapi(pluginServer.services[name], strapi));
        }

        return resolved.get(name);
      },
    });
  });

  const plugins = (mock.plugins ?? {}) as UnknownRecord;
  mock.plugins = { ...plugins, i18n: { services } };

  global.strapi = strapi;
  // A new instance: forget the one a previous test bound through a service factory
  resetStrapiBinding();

  return { strapi, pluginServer, services };
};

/**
 * `global.strapi` is defined by the unit setup with a setter that cannot take `undefined`.
 */
export const resetGlobalStrapi = () => {
  global.strapi = {} as Core.Strapi;
};

/**
 * In-memory `strapi.store()`: one map per `type/name`, keyed by `key`.
 */
export const createStore = (initial: UnknownRecord = {}) => {
  const values = new Map<string, unknown>(Object.entries(initial));

  const store = jest.fn((params: { type: string; name: string; key?: string }) => ({
    get: jest.fn(async (args: { key?: string }) => values.get(args.key ?? params.key ?? '')),
    set: jest.fn(async (args: { key?: string; value: unknown }) => {
      values.set(args.key ?? params.key ?? '', args.value);
      return { value: args.value };
    }),
  }));

  return { store, values };
};

export const createCtx = (overrides: Partial<Ctx> = {}): Ctx => {
  return {
    state: {},
    params: {},
    query: {},
    request: { body: undefined, query: {} },
    notFound: jest.fn(),
    forbidden: jest.fn(),
    ...overrides,
  };
};

export const localizedModel = (uid: string, attributes: UnknownRecord = {}, extra = {}) => ({
  uid,
  kind: 'collectionType',
  modelType: 'contentType',
  collectionName: uid.split('.')[1],
  pluginOptions: { i18n: { localized: true } },
  options: {},
  attributes,
  ...extra,
});

export const nonLocalizedModel = (uid: string, attributes: UnknownRecord = {}, extra = {}) => ({
  ...localizedModel(uid, attributes, extra),
  pluginOptions: {},
});
