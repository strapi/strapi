import { describe, expect, test, vi } from 'vitest';

import register from '../register';

const createStrapiStub = () => {
  const passport = { init: vi.fn(() => 'passport-middleware') };

  const strapi = {
    admin: { services: { passport } },
    db: {
      migrations: { providers: { internal: { register: vi.fn() } } },
      schema: { registerAttributeRenameHandler: vi.fn() },
    },
    server: { api: () => ({ use: vi.fn() }) },
    get: () => ({ register: vi.fn() }),
    add: vi.fn(),
    ee: { entitlements: { register: vi.fn() } },
    config: { get: () => false },
  } as any;

  return { strapi, passport };
};

describe('admin register', () => {
  test('initializes passport from the injected Strapi instance, not the global one', () => {
    const globalStub = createStrapiStub();
    const injectedStub = createStrapiStub();
    global.strapi = globalStub.strapi;
    // The setup file attaches the lookups on global assignment only.
    injectedStub.strapi.service = (uid: string) =>
      uid === 'admin::passport' ? injectedStub.passport : undefined;

    register({ strapi: injectedStub.strapi });

    expect(injectedStub.passport.init).toHaveBeenCalledTimes(1);
    expect(globalStub.passport.init).not.toHaveBeenCalled();
  });
});
