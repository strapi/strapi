import bcrypt from 'bcryptjs';
import type Koa from 'koa';

import documentation from '../documentation';

const SERVER_URL = 'http://localhost:1337';

const createStrapi = (storedConfig: Record<string, unknown>) => {
  return {
    config: { server: { url: SERVER_URL } },
    store: jest.fn(() => ({ get: jest.fn(async () => storedConfig) })),
  };
};

const createContext = (body: Record<string, unknown>) => {
  return {
    request: { body },
    session: {},
    redirect: jest.fn(),
  } as unknown as Koa.Context & { redirect: jest.Mock; session: Record<string, unknown> };
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
});
