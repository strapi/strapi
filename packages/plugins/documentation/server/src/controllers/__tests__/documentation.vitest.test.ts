import bcrypt from 'bcryptjs';
import type Koa from 'koa';
import { describe, expect, test, vi, type Mock } from 'vitest';

import documentation from '../documentation';

const SERVER_URL = 'http://localhost:1337';

const createStrapi = (storedConfig: Record<string, unknown>) => {
  return {
    config: { server: { url: SERVER_URL } },
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
    test.each([
      { major: '..', minor: '1', patch: '0' },
      { major: '1', minor: '../../secret', patch: '0' },
      { major: '1', minor: '0', patch: 'x' },
    ])('returns 404 for non-numeric version params %o', async (params) => {
      const ctx = {
        params,
        notFound: vi.fn(),
      } as unknown as Koa.Context & { notFound: Mock };

      await documentation.index(ctx, vi.fn());

      expect(ctx.notFound).toHaveBeenCalled();
    });
  });
});
