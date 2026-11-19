import path from 'path';
import bcrypt from 'bcryptjs';
import fs from 'fs-extra';
import { get } from 'lodash';
import type Koa from 'koa';
import { describe, expect, test, vi, type Mock } from 'vitest';

import documentation from '../documentation';

vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal<{ default: typeof import('fs-extra') }>();
  const mocked = {
    ...actual.default,
    readFileSync: vi.fn(() => '{"openapi":"3.0.0"}'),
    ensureFile: vi.fn(),
    writeFile: vi.fn(),
  };

  return { ...mocked, default: mocked };
});
vi.mock('koa-static', () => ({ default: vi.fn(() => vi.fn()) }));
vi.mock('../../public/index.html', () => ({ default: 'backend=<%= backendUrl %>' }));
vi.mock('../../public/login.html', () => ({
  default: '<form action="<%= actionUrl %>"></form><p class="error"></p>',
}));

const SERVER_URL = 'http://localhost:1337';

const DIRS = {
  app: { extensions: '/project/src/extensions' },
  dist: { extensions: '/project/dist/src/extensions' },
};

/**
 * Mirrors the config provider: the startup copy as own keys, plus `get` over the live tree.
 */
const createConfig = (values: Record<string, unknown>) => ({
  ...values,
  get: (key: string, defaultValue?: unknown) => get(values, key, defaultValue),
});

const createStrapi = (
  storedConfig: Record<string, unknown>,
  { environment = 'development' }: { environment?: string } = {}
) => {
  return {
    config: createConfig({ environment, server: { url: SERVER_URL } }),
    dirs: DIRS,
    log: { error: vi.fn() },
    store: vi.fn(() => ({ get: vi.fn(async () => storedConfig) })),
  };
};

const createContext = (body: Record<string, unknown>) => {
  return {
    request: { body },
    session: {},
    redirect: vi.fn(),
  } as unknown as Koa.Context & { redirect: Mock; session: Record<string, unknown> };
};

describe('Documentation plugin | Documentation controller', () => {
  describe('login', () => {
    test('logs in with the correct password', async () => {
      const hash = await bcrypt.hash('Password123', 4);
      global.strapi = createStrapi({ restrictedAccess: true, password: hash }) as any;
      const ctx = createContext({ password: 'Password123' });

      await documentation.login(ctx);

      expect(ctx.session.documentation).toEqual({ logged: true });
      expect(ctx.redirect).toHaveBeenCalledWith(`${SERVER_URL}/documentation`);
    });

    test('redirects with an error for a wrong password', async () => {
      const hash = await bcrypt.hash('Password123', 4);
      global.strapi = createStrapi({ restrictedAccess: true, password: hash }) as any;
      const ctx = createContext({ password: 'WrongPassword1' });

      await documentation.login(ctx);

      expect(ctx.session.documentation).toBeUndefined();
      expect(ctx.redirect).toHaveBeenCalledWith(`${SERVER_URL}/documentation?error=password`);
    });

    test('redirects with an error when no password hash is stored', async () => {
      // updateSettings stores no hash when restricted access is turned off
      global.strapi = createStrapi({ restrictedAccess: false }) as any;
      const ctx = createContext({ password: 'Password123' });

      await documentation.login(ctx);

      expect(ctx.session.documentation).toBeUndefined();
      expect(ctx.redirect).toHaveBeenCalledWith(`${SERVER_URL}/documentation?error=password`);
    });

    test('redirects with an error when no password is submitted', async () => {
      const hash = await bcrypt.hash('Password123', 4);
      global.strapi = createStrapi({ restrictedAccess: true, password: hash }) as any;
      const ctx = createContext({});

      await documentation.login(ctx);

      expect(ctx.session.documentation).toBeUndefined();
      expect(ctx.redirect).toHaveBeenCalledWith(`${SERVER_URL}/documentation?error=password`);
    });
  });

  describe('index', () => {
    const createIndexContext = () =>
      ({
        params: { major: '1', minor: '0', patch: '0' },
        url: '/documentation/v1.0.0',
      } as unknown as Koa.Context);

    test('fills the Swagger UI layout with the server URL', async () => {
      global.strapi = createStrapi({}) as any;

      await documentation.index(createIndexContext(), vi.fn());

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve(DIRS.app.extensions, 'documentation', 'public', 'index.html'),
        `backend=${SERVER_URL}`
      );
    });

    test('reads the generated specs from dist in production', async () => {
      global.strapi = createStrapi({}, { environment: 'production' }) as any;

      await documentation.index(createIndexContext(), vi.fn());

      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(
          DIRS.dist.extensions,
          'documentation',
          'documentation',
          '1.0.0',
          'full_documentation.json'
        ),
        'utf8'
      );
    });
  });

  describe('loginView', () => {
    test('posts the login form to the server URL', async () => {
      global.strapi = createStrapi({}) as any;
      const ctx = { query: {}, url: '/documentation/login' } as unknown as Koa.Context;

      await documentation.loginView(ctx, vi.fn());

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve(DIRS.app.extensions, 'documentation', 'public', 'login.html'),
        expect.stringContaining(`action="${SERVER_URL}/documentation/login"`)
      );
    });
  });
});
