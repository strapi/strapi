import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import * as openapi from '@strapi/openapi';
import fs from 'fs-extra';
import { registerOpenAPIRoute } from '../openapi';

vi.mock('fs-extra', () => {
  const fsExtra = {
    stat: vi.fn(),
    readJson: vi.fn(),
    outputJson: vi.fn(),
  };

  return { ...fsExtra, default: fsExtra };
});

vi.mock('@strapi/openapi', () => ({
  generate: vi.fn(),
}));

const mockedGenerate = vi.mocked(openapi.generate);
const mockedFsStat = vi.mocked(fs.stat);
const mockedFsReadJson = vi.mocked(fs.readJson);
const mockedFsOutputJson = vi.mocked(fs.outputJson);

const createCtx = () => {
  const ctx = {
    body: undefined,
    status: undefined,
    headers: {} as Record<string, string>,
    set: vi.fn((key: string, value: string) => {
      (ctx.headers as Record<string, string>)[key] = value;
    }),
    internalServerError: vi.fn(),
  };

  return ctx;
};

let ctx = createCtx();

const createStrapiMock = (
  openapiConfig: Record<string, unknown> = {},
  options: { apiPrefix?: string; adminPath?: string } = {}
) => {
  const { apiPrefix = '/api', adminPath = '/admin' } = options;

  return {
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'server.openapi') {
          return openapiConfig;
        }

        if (key === 'api.rest.prefix') {
          return apiPrefix;
        }

        if (key === 'admin.path') {
          return adminPath;
        }

        return defaultValue;
      }),
    },
    dirs: {
      app: {
        root: '/tmp/app',
      },
    },
    server: {
      routes: vi.fn(),
    },
    log: {
      error: vi.fn(),
    },
  };
};

describe('registerOpenAPIRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createCtx();
  });

  test('does not register route when disabled', () => {
    const strapi = createStrapiMock({});

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).not.toHaveBeenCalled();
  });

  test('registers one route per configured endpoint', () => {
    const strapi = createStrapiMock({
      'content-api': {
        access: 'public',
        route: {
          path: '/spec.json',
        },
      },
      admin: {
        access: 'authenticated',
      },
    });

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).toHaveBeenCalledTimes(2);
    const [contentApiRouter] = (strapi.server.routes as Mock).mock.calls[0];
    const [adminRouter] = (strapi.server.routes as Mock).mock.calls[1];

    expect(contentApiRouter.type).toBe('content-api');
    expect(contentApiRouter.routes).toHaveLength(1);
    expect(contentApiRouter.routes[0].method).toBe('GET');
    expect(contentApiRouter.routes[0].path).toBe('/spec.json');
    expect(contentApiRouter.routes[0].config.auth).toBe(false);

    expect(adminRouter.type).toBe('admin');
    expect(adminRouter.prefix).toBe('/admin');
    expect(adminRouter.routes).toHaveLength(1);
    expect(adminRouter.routes[0].method).toBe('GET');
    expect(adminRouter.routes[0].path).toBe('/openapi.json');
    // admin endpoint requires an authenticated admin
    expect(adminRouter.routes[0].config.policies).toEqual(['admin::isAuthenticatedAdmin']);
    expect(adminRouter.routes[0].config.auth).toBeUndefined();
  });

  test('content-api public access disables auth', () => {
    const strapi = createStrapiMock({
      'content-api': {
        access: 'public',
      },
    });

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).toHaveBeenCalledTimes(1);
    const [contentApiRouter] = (strapi.server.routes as Mock).mock.calls[0];
    expect(contentApiRouter.routes[0].config.auth).toBe(false);
  });

  test('throws when the content-api endpoint is configured as authenticated', () => {
    const strapi = createStrapiMock({
      'content-api': {
        access: 'authenticated',
      },
    });

    expect(() => registerOpenAPIRoute(strapi as any)).toThrow(
      'Invalid OpenAPI access "authenticated" for "content-api". Expected one of: disabled, public'
    );
  });

  test('admin authenticated access requires an authenticated admin', () => {
    const strapi = createStrapiMock({
      admin: {
        access: 'authenticated',
      },
    });

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).toHaveBeenCalledTimes(1);
    const [adminRouter] = (strapi.server.routes as Mock).mock.calls[0];
    expect(adminRouter.routes[0].config.policies).toEqual(['admin::isAuthenticatedAdmin']);
    expect(adminRouter.routes[0].config.auth).toBeUndefined();
  });

  test('throws when the admin endpoint is configured as public', () => {
    const strapi = createStrapiMock({
      admin: {
        access: 'public',
      },
    });

    expect(() => registerOpenAPIRoute(strapi as any)).toThrow(
      'Invalid OpenAPI access "public" for "admin". Expected one of: disabled, authenticated'
    );
  });

  test('serves fresh file cache when available', async () => {
    const now = Date.now();
    const document = { openapi: '3.1.0', info: { title: 'Cached' } };
    const strapi = createStrapiMock({
      'content-api': {
        access: 'public',
        cache: {
          enabled: true,
          maxAgeMs: 60_000,
          filePath: '.strapi/openapi/openapi.json',
        },
      },
    });

    (mockedFsStat as Mock).mockResolvedValue({ mtimeMs: now });
    (mockedFsReadJson as Mock).mockResolvedValue(document);

    registerOpenAPIRoute(strapi as any);
    const [contentApiRouter] = (strapi.server.routes as Mock).mock.calls[0];
    const contentApiRoute = contentApiRouter.routes[0];

    await contentApiRoute.handler(ctx);

    expect(mockedFsReadJson).toHaveBeenCalledTimes(1);
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(ctx.body).toEqual(document);
  });

  test('regenerates and writes cache when cache is stale', async () => {
    const now = Date.now();
    const document = { openapi: '3.1.0', info: { title: 'Generated', version: '1.0.0' } };
    const strapi = createStrapiMock({
      'content-api': {
        access: 'public',
        cache: {
          enabled: true,
          maxAgeMs: 50,
          filePath: '.strapi/openapi/openapi.json',
        },
      },
    });

    (mockedFsStat as Mock).mockResolvedValue({ mtimeMs: now - 1_000 });
    (mockedGenerate as Mock).mockReturnValue({ document, durationMs: 1 });

    registerOpenAPIRoute(strapi as any);
    const [contentApiRouter] = (strapi.server.routes as Mock).mock.calls[0];
    const contentApiRoute = contentApiRouter.routes[0];

    await contentApiRoute.handler(ctx);

    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedFsOutputJson).toHaveBeenCalledTimes(1);
    expect(ctx.body).toEqual(document);
  });

  test('does not expose admin route when admin endpoint is disabled', () => {
    const strapi = createStrapiMock({
      'content-api': {
        access: 'public',
      },
      admin: {
        access: 'disabled',
      },
    });

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).toHaveBeenCalledTimes(1);
    const [contentApiRouter] = (strapi.server.routes as Mock).mock.calls[0];
    expect(contentApiRouter.type).toBe('content-api');
  });

  test('supports admin paths that include admin prefix without double prefixing', () => {
    const strapi = createStrapiMock({
      admin: {
        access: 'authenticated',
        route: {
          path: '/admin/spec.json',
        },
      },
    });

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).toHaveBeenCalledTimes(1);
    const [adminRouter] = (strapi.server.routes as Mock).mock.calls[0];
    expect(adminRouter.type).toBe('admin');
    expect(adminRouter.prefix).toBe('/admin');
    expect(adminRouter.routes[0].path).toBe('/spec.json');
  });

  test('throws when configured endpoints resolve to the same path', () => {
    const strapi = createStrapiMock(
      {
        'content-api': {
          access: 'public',
          route: {
            path: '/openapi.json',
          },
        },
        admin: {
          access: 'authenticated',
        },
      },
      { adminPath: '/api' }
    );

    expect(() => registerOpenAPIRoute(strapi as any)).toThrow(
      'Duplicate OpenAPI endpoint path detected: "/api/openapi.json"'
    );
  });

  test('throws for unsupported access values', () => {
    const strapi = createStrapiMock({
      admin: {
        access: 'unknown-access',
      },
    });

    expect(() => registerOpenAPIRoute(strapi as any)).toThrow(
      'Invalid OpenAPI access "unknown-access" for "admin". Expected one of: disabled, authenticated'
    );
  });
});
