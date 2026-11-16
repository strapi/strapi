import Router from '@koa/router';
import { describe, expect, test } from 'vitest';

import { createAPI } from '../api';
import composeEndpoint from '../compose-endpoint';
import { createServer } from '../index';

const strapi = {
  config: {
    get: (_key: string, defaultValue?: unknown) => defaultValue,
  },
  get(name: string) {
    if (name === 'policies') {
      return { resolve: () => [] };
    }

    return undefined;
  },
  log: {
    error: () => undefined,
  },
} as any;

describe('server route registration', () => {
  test('lists the api stack and mounts it on another router', () => {
    const api = createAPI(strapi, { prefix: '/api', type: 'content-api' });

    expect(api.listRoutes()).toEqual([]);

    const parent = new Router();
    api.mount(parent);

    expect(parent.stack.length).toBeGreaterThan(0);
  });

  test('registers the route path as written', () => {
    const router = new Router();

    composeEndpoint(strapi)(
      {
        method: 'GET',
        path: ' /users/:id(\\d+) ',
        handler: () => undefined,
      } as any,
      { router }
    );

    expect(router.stack.map((layer) => layer.path)).toContain('/users/:id(\\d+)');
  });

  test('lists routes registered on the root router', async () => {
    const server = createServer(strapi);

    try {
      expect(server.listRoutes().some((layer) => layer.path === '/_health')).toBe(true);
    } finally {
      await server.destroy();
    }
  });
});
