import path from 'path';
import fs from 'fs-extra';
import * as openapi from '@strapi/openapi';
import type { Core } from '@strapi/types';

type OpenAPIConfig = Core.Config.OpenAPI;
type OpenAPIEndpointConfig = NonNullable<OpenAPIConfig['content-api']>;
type OpenAPIAccess = NonNullable<OpenAPIEndpointConfig['access']>;
type OpenAPIRouteType = keyof OpenAPIConfig;

const SUPPORTED_ACCESS: OpenAPIAccess[] = ['disabled', 'public', 'authenticated'];

interface ResolvedEndpointConfig {
  type: OpenAPIRouteType;
  access: OpenAPIAccess;
  routePath: string;
  routerPrefix?: string;
  fullPath: string;
  cacheEnabled: boolean;
  cacheMaxAgeMs: number;
  absoluteCachePath: string;
}

const DEFAULTS = {
  routePath: '/openapi.json',
  access: 'disabled' as const,
  cacheEnabled: true,
  cacheMaxAgeMs: 60_000,
  cacheRelativeFilePaths: {
    'content-api': '.strapi/openapi/content-api.json',
    admin: '.strapi/openapi/admin.json',
  } as Record<OpenAPIRouteType, string>,
};

const normalizePath = (value: string) => {
  if (!value) {
    return DEFAULTS.routePath;
  }

  return value.startsWith('/') ? value : `/${value}`;
};

const joinPaths = (basePath: string, routePath: string) => {
  const normalizedBasePath = normalizePath(basePath || '/');
  const normalizedRoutePath = normalizePath(routePath || DEFAULTS.routePath);

  const trimmedBasePath = normalizedBasePath === '/' ? '' : normalizedBasePath.replace(/\/+$/, '');

  return `${trimmedBasePath}${normalizedRoutePath}` || '/';
};

const stripBasePrefix = (routePath: string, basePath: string) => {
  const normalizedBasePath = normalizePath(basePath || '/');
  const normalizedRoutePath = normalizePath(routePath || DEFAULTS.routePath);

  if (normalizedBasePath === '/') {
    return normalizedRoutePath;
  }

  if (normalizedRoutePath === normalizedBasePath) {
    return '/';
  }

  if (normalizedRoutePath.startsWith(`${normalizedBasePath}/`)) {
    const strippedPath = normalizedRoutePath.slice(normalizedBasePath.length);
    return normalizePath(strippedPath);
  }

  return normalizedRoutePath;
};

const resolveEndpointConfig = (
  strapi: Core.Strapi,
  rawConfig: OpenAPIEndpointConfig | undefined,
  type: OpenAPIRouteType
): ResolvedEndpointConfig => {
  const apiPrefix = strapi.config.get('api.rest.prefix', '/api');
  const adminPath = strapi.config.get('admin.path', '/admin');
  const basePath = type === 'content-api' ? apiPrefix : adminPath;

  const configuredPath = rawConfig?.route?.path ?? DEFAULTS.routePath;
  const routePath = stripBasePrefix(configuredPath, basePath);
  const routerPrefix = type === 'admin' ? normalizePath(basePath) : undefined;
  const fullPath =
    type === 'content-api'
      ? joinPaths(normalizePath(apiPrefix), routePath)
      : joinPaths(routerPrefix!, routePath);
  const access = rawConfig?.access ?? DEFAULTS.access;

  if (!SUPPORTED_ACCESS.includes(access)) {
    throw new Error(
      `Invalid OpenAPI access "${access}" for "${type}". Expected one of: ${SUPPORTED_ACCESS.join(', ')}`
    );
  }

  // The admin spec is never public.
  if (type === 'admin' && access === 'public') {
    throw new Error('OpenAPI admin endpoint does not support access "public"');
  }

  const cacheEnabled = rawConfig?.cache?.enabled ?? DEFAULTS.cacheEnabled;
  const cacheMaxAgeMs = rawConfig?.cache?.maxAgeMs ?? DEFAULTS.cacheMaxAgeMs;
  const configuredCachePath = rawConfig?.cache?.filePath ?? DEFAULTS.cacheRelativeFilePaths[type];
  const absoluteCachePath = path.isAbsolute(configuredCachePath)
    ? configuredCachePath
    : path.resolve(strapi.dirs.app.root, configuredCachePath);

  return {
    type,
    access,
    routePath,
    routerPrefix,
    fullPath,
    cacheEnabled,
    cacheMaxAgeMs,
    absoluteCachePath,
  };
};

/**
 * Build the route `config` (auth + policies) for an endpoint.
 *
 * - `admin`: requires an authenticated admin via the `admin::isAuthenticatedAdmin`
 *   policy. Only `authenticated` reaches here (`public` is rejected for admin).
 *   Granular per-permission RBAC is intentionally left for a later iteration.
 * - `content-api`: `authenticated` relies on the standard Content API auth
 *   (authenticated users-permissions user or full-access API token); `public`
 *   disables auth so anyone can read the spec.
 */
const buildRouteConfig = (config: ResolvedEndpointConfig): Record<string, unknown> => {
  if (config.type === 'admin') {
    return { policies: ['admin::isAuthenticatedAdmin'] };
  }

  return config.access === 'public' ? { auth: false } : {};
};

const resolveOpenAPIConfig = (strapi: Core.Strapi) => {
  const rawConfig = strapi.config.get('server.openapi', {}) as OpenAPIConfig;

  return [
    resolveEndpointConfig(strapi, rawConfig['content-api'], 'content-api'),
    resolveEndpointConfig(strapi, rawConfig.admin, 'admin'),
  ].filter((config) => config.access !== 'disabled');
};

const readCache = async (cachePath: string, maxAgeMs: number) => {
  if (maxAgeMs < 0) {
    return null;
  }

  try {
    const stat = await fs.stat(cachePath);
    const ageMs = Date.now() - stat.mtimeMs;

    if (ageMs > maxAgeMs) {
      return null;
    }

    return await fs.readJson(cachePath);
  } catch {
    return null;
  }
};

const writeCache = async (cachePath: string, document: unknown) => {
  await fs.outputJson(cachePath, document, { spaces: 2 });
};

const generateDocument = (strapi: Core.Strapi, type: OpenAPIRouteType) => {
  return openapi.generate(strapi, { type }).document;
};

export const registerOpenAPIRoute = (strapi: Core.Strapi) => {
  const configs = resolveOpenAPIConfig(strapi);

  if (!configs.length) {
    return;
  }

  const fullPathSet = new Set<string>();

  for (const config of configs) {
    if (fullPathSet.has(config.fullPath)) {
      throw new Error(`Duplicate OpenAPI endpoint path detected: "${config.fullPath}"`);
    }

    fullPathSet.add(config.fullPath);
  }

  const routers = configs.map((config) => {
    const handler: Core.MiddlewareHandler = async (ctx) => {
      try {
        if (config.cacheEnabled) {
          const cachedDocument = await readCache(config.absoluteCachePath, config.cacheMaxAgeMs);

          if (cachedDocument) {
            ctx.set('Content-Type', 'application/json');
            ctx.body = cachedDocument;
            return;
          }
        }

        const document = generateDocument(strapi, config.type);

        if (config.cacheEnabled) {
          await writeCache(config.absoluteCachePath, document);
        }

        ctx.set('Content-Type', 'application/json');
        ctx.body = document;
      } catch (error) {
        strapi.log.error(error);
        ctx.internalServerError('Failed to generate OpenAPI document');
      }
    };

    return {
      type: config.type,
      ...(config.routerPrefix ? { prefix: config.routerPrefix } : {}),
      routes: [
        {
          method: 'GET' as const,
          path: config.routePath,
          handler,
          info: {
            type: config.type,
          },
          config: buildRouteConfig(config),
        },
      ],
    };
  });

  routers.forEach((router) => strapi.server.routes(router));
};
