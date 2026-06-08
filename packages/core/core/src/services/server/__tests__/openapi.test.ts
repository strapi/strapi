import * as openapi from '@strapi/openapi';
import fs from 'fs-extra';
import { registerOpenAPIRoute } from '../openapi';

declare const jest: any;

jest.mock('fs-extra', () => ({
  stat: jest.fn(),
  readJson: jest.fn(),
  outputJson: jest.fn(),
}));

jest.mock('@strapi/openapi', () => ({
  generate: jest.fn(),
}));

const mockedGenerate = jest.mocked(openapi.generate);
const mockedFsStat = jest.mocked(fs.stat);
const mockedFsReadJson = jest.mocked(fs.readJson);
const mockedFsOutputJson = jest.mocked(fs.outputJson);

const createCtx = () => {
  const ctx = {
    body: undefined,
    status: undefined,
    headers: {} as Record<string, string>,
    set: jest.fn((key: string, value: string) => {
      (ctx.headers as Record<string, string>)[key] = value;
    }),
    internalServerError: jest.fn(),
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
      get: jest.fn((key: string, defaultValue?: unknown) => {
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
      routes: jest.fn(),
    },
    log: {
      error: jest.fn(),
    },
  };
};

describe('registerOpenAPIRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createCtx();
  });

  test('does not register route when disabled', () => {
    const strapi = createStrapiMock({});

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).not.toHaveBeenCalled();
  });

  test('registers one route per enabled endpoint', () => {
    const strapi = createStrapiMock({
      'content-api': {
        enabled: true,
        route: {
          path: '/spec.json',
        },
      },
      admin: {
        enabled: true,
      },
    });

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).toHaveBeenCalledTimes(2);
    const [contentApiRouter] = (strapi.server.routes as jest.Mock).mock.calls[0];
    const [adminRouter] = (strapi.server.routes as jest.Mock).mock.calls[1];

    expect(contentApiRouter.type).toBe('content-api');
    expect(contentApiRouter.routes).toHaveLength(1);
    expect(contentApiRouter.routes[0].method).toBe('GET');
    expect(contentApiRouter.routes[0].path).toBe('/spec.json');
    // content-api spec is public when the endpoint is enabled
    expect(contentApiRouter.routes[0].config.auth).toBe(false);

    expect(adminRouter.type).toBe('admin');
    expect(adminRouter.prefix).toBe('/admin');
    expect(adminRouter.routes).toHaveLength(1);
    expect(adminRouter.routes[0].method).toBe('GET');
    expect(adminRouter.routes[0].path).toBe('/openapi.json');
    // admin spec requires an authenticated admin (default admin auth)
    expect(adminRouter.routes[0].config.auth).toBeUndefined();
  });

  test('content-api spec is public when enabled', () => {
    const strapi = createStrapiMock({
      'content-api': {
        enabled: true,
      },
    });

    registerOpenAPIRoute(strapi as any);

    const [contentApiRouter] = (strapi.server.routes as jest.Mock).mock.calls[0];
    expect(contentApiRouter.routes[0].config.auth).toBe(false);
  });

  test('admin spec requires authentication when enabled', () => {
    const strapi = createStrapiMock({
      admin: {
        enabled: true,
      },
    });

    registerOpenAPIRoute(strapi as any);

    const [adminRouter] = (strapi.server.routes as jest.Mock).mock.calls[0];
    expect(adminRouter.routes[0].config.auth).toBeUndefined();
  });

  test('serves fresh file cache when available', async () => {
    const now = Date.now();
    const document = { openapi: '3.1.0', info: { title: 'Cached' } };
    const strapi = createStrapiMock({
      'content-api': {
        enabled: true,
        cache: {
          enabled: true,
          maxAgeMs: 60_000,
          filePath: '.strapi/openapi/openapi.json',
        },
      },
    });

    (mockedFsStat as jest.Mock).mockResolvedValue({ mtimeMs: now });
    (mockedFsReadJson as jest.Mock).mockResolvedValue(document);

    registerOpenAPIRoute(strapi as any);
    const [contentApiRouter] = (strapi.server.routes as jest.Mock).mock.calls[0];
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
        enabled: true,
        cache: {
          enabled: true,
          maxAgeMs: 50,
          filePath: '.strapi/openapi/openapi.json',
        },
      },
    });

    (mockedFsStat as jest.Mock).mockResolvedValue({ mtimeMs: now - 1_000 });
    (mockedGenerate as jest.Mock).mockReturnValue({ document, durationMs: 1 });

    registerOpenAPIRoute(strapi as any);
    const [contentApiRouter] = (strapi.server.routes as jest.Mock).mock.calls[0];
    const contentApiRoute = contentApiRouter.routes[0];

    await contentApiRoute.handler(ctx);

    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedFsOutputJson).toHaveBeenCalledTimes(1);
    expect(ctx.body).toEqual(document);
  });

  test('does not expose admin route when admin endpoint is disabled', () => {
    const strapi = createStrapiMock({
      'content-api': {
        enabled: true,
      },
      admin: {
        enabled: false,
      },
    });

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).toHaveBeenCalledTimes(1);
    const [contentApiRouter] = (strapi.server.routes as jest.Mock).mock.calls[0];
    expect(contentApiRouter.type).toBe('content-api');
  });

  test('supports admin paths that include admin prefix without double prefixing', () => {
    const strapi = createStrapiMock({
      admin: {
        enabled: true,
        route: {
          path: '/admin/spec.json',
        },
      },
    });

    registerOpenAPIRoute(strapi as any);

    expect(strapi.server.routes).toHaveBeenCalledTimes(1);
    const [adminRouter] = (strapi.server.routes as jest.Mock).mock.calls[0];
    expect(adminRouter.type).toBe('admin');
    expect(adminRouter.prefix).toBe('/admin');
    expect(adminRouter.routes[0].path).toBe('/spec.json');
  });

  test('throws when configured endpoints resolve to the same path', () => {
    const strapi = createStrapiMock(
      {
        'content-api': {
          enabled: true,
          route: {
            path: '/openapi.json',
          },
        },
        admin: {
          enabled: true,
        },
      },
      { adminPath: '/api' }
    );

    expect(() => registerOpenAPIRoute(strapi as any)).toThrow(
      'Duplicate OpenAPI endpoint path detected: "/api/openapi.json"'
    );
  });

  test('still derives admin prefix when admin endpoint has minimal config', () => {
    const strapi = createStrapiMock({
      admin: {
        enabled: true,
      },
    });

    registerOpenAPIRoute(strapi as any);

    const [adminRouter] = (strapi.server.routes as jest.Mock).mock.calls[0];
    expect(adminRouter.type).toBe('admin');
    expect(adminRouter.prefix).toBe('/admin');
    expect(adminRouter.routes[0].config.auth).toBeUndefined();
  });
});
