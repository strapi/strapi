import type { Core } from '@strapi/types';

import { getGlobalId } from '../domain/content-type';
import * as factories from '../factories';
import type { AppContentType } from './types';

/**
 * Synthetic API namespace used to host custom top-level routes (and any
 * in-code controllers/services) that are not attached to a specific content
 * type's API. Reversible: callers can group routes under a content type's
 * `apiName` instead by attaching them there.
 */
export const CUSTOM_API_NAME = 'application';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const assertKebabCase = (value: string, field: string, ctName: string): void => {
  if (!KEBAB_CASE.test(value)) {
    throw new Error(
      `Programmatic content type "${ctName}": \`${field}\` must be kebab-case (got "${value}")`
    );
  }
};

export interface RawApiModule {
  contentTypes: Record<string, { schema: Record<string, unknown> }>;
  controllers: Record<string, unknown>;
  services: Record<string, unknown>;
  routes: Record<string, unknown>;
  policies: Record<string, unknown>;
  middlewares: Record<string, unknown>;
  config: Record<string, unknown>;
}

const emptyApiModule = (): RawApiModule => ({
  contentTypes: {},
  controllers: {},
  services: {},
  routes: {},
  policies: {},
  middlewares: {},
  config: {},
});

/**
 * Normalize a single strict, explicit content type into the schema object the
 * `content-types` registry expects (mirrors what the file-based loader builds:
 * `apiName`, `collectionName`, and `globalId` are set on the schema). Throws a
 * clear startup error when required fields are missing or malformed.
 */
export const normalizeContentType = (ct: AppContentType) => {
  if (!ct || typeof ct !== 'object') {
    throw new Error('Each programmatic content type must be an object');
  }

  const { singularName, pluralName, displayName, attributes } = ct;

  if (!singularName) {
    throw new Error('A programmatic content type requires a `singularName`');
  }
  if (!pluralName) {
    throw new Error(`Programmatic content type "${singularName}" requires a \`pluralName\``);
  }
  if (!displayName) {
    throw new Error(`Programmatic content type "${singularName}" requires a \`displayName\``);
  }

  assertKebabCase(singularName, 'singularName', singularName);
  assertKebabCase(pluralName, 'pluralName', singularName);

  const apiName = ct.apiName ?? singularName;
  const kind = ct.kind ?? 'collectionType';

  const schema: Record<string, unknown> = {
    kind,
    collectionName: ct.collectionName || singularName,
    info: {
      singularName,
      pluralName,
      displayName,
      ...(ct.description ? { description: ct.description } : {}),
    },
    options: ct.options ?? {},
    pluginOptions: ct.pluginOptions ?? {},
    attributes: { ...attributes },
  };

  // Mirror the file-based loader: stamp apiName / globalId onto the schema.
  schema.apiName = apiName;
  schema.globalId = getGlobalId(schema as never);

  return {
    apiName,
    key: singularName,
    autoCrud: ct.api !== false,
    definition: { schema, actions: {}, lifecycles: {} },
  };
};

/**
 * Build the `api::<apiName>` modules from in-code content types and (optionally)
 * in-code custom routes. Content types are grouped by `apiName`; auto-CRUD
 * router/controller/service are generated for each content type with
 * `api !== false`. Custom routes are attached to the {@link CUSTOM_API_NAME}
 * module (or merged into it if a content type already uses that name).
 *
 * Returns a map of `apiName -> RawApiModule` ready to be registered via
 * `strapi.get('apis').add(...)`.
 */
export const buildApiModules = (
  contentTypes: AppContentType[] = [],
  customRoutes: Core.RouteInput[] = []
): Record<string, RawApiModule> => {
  const modules: Record<string, RawApiModule> = {};

  const getModule = (apiName: string): RawApiModule => {
    if (!modules[apiName]) {
      modules[apiName] = emptyApiModule();
    }
    return modules[apiName];
  };

  for (const ct of contentTypes) {
    const { apiName, key, autoCrud, definition } = normalizeContentType(ct);
    const mod = getModule(apiName);

    if (mod.contentTypes[key]) {
      throw new Error(`Duplicate programmatic content type "${key}" in API "${apiName}"`);
    }

    mod.contentTypes[key] = definition as { schema: Record<string, unknown> };

    if (autoCrud) {
      const uid = `api::${apiName}.${key}` as Parameters<typeof factories.createCoreController>[0];
      mod.controllers[key] = factories.createCoreController(uid);
      mod.services[key] = factories.createCoreService(uid);
      mod.routes[key] = factories.createCoreRouter(uid);
    }
  }

  if (customRoutes.length > 0) {
    const mod = getModule(CUSTOM_API_NAME);

    // Inline routes are mounted at the root (no `/api` prefix) and default to
    // public (`auth: false`) so `post('/echo', handler)` works as shown in the
    // RFC. An explicit per-route `config.auth` always wins. Reversible: attach
    // the routes to a content type's `apiName` for the prefixed/auth-gated
    // content-api behavior instead.
    const routes = customRoutes.map((route) => ({
      ...route,
      config: { auth: false, ...(route.config ?? {}) },
    }));

    // Inline routes are content-api routes (served under the `/api` prefix, like
    // file-based custom routes) and default to public (`auth: false`) so they
    // work without any permission setup. An explicit per-route `config.auth`
    // always wins. `registerAPIRoutes` forces `type: 'content-api'` on every api
    // router regardless, so this is set explicitly for clarity.
    mod.routes.custom = { type: 'content-api', routes };
  }

  return modules;
};
