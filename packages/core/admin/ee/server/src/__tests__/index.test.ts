import type { Modules } from '@strapi/types';
import executeEERegister from '../register';
import getAdminEE from '..';

jest.mock('../register', () => ({ __esModule: true, default: jest.fn() }));

describe('getAdminEE', () => {
  const setup = (enabledFeatures: Modules.EE.FeatureName[] = []) => {
    global.strapi = {
      add: jest.fn(),
      config: { get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue) },
      ee: {
        features: {
          isEnabled: jest.fn((name: Modules.EE.FeatureName) => enabledFeatures.includes(name)),
        },
      },
    } as any;
  };

  test('registers neither the SSO nor the audit-logs routes without their feature', () => {
    setup();

    const admin = getAdminEE();

    expect(admin.routes).not.toHaveProperty('sso');
    expect(admin.routes).not.toHaveProperty('audit-logs');
    expect(admin.controllers).not.toHaveProperty('audit-logs');
  });

  test('registers the SSO routes with sso', () => {
    setup(['sso']);

    const admin = getAdminEE();

    expect(admin.routes).toHaveProperty('sso');
    expect(admin.routes).not.toHaveProperty('audit-logs');
  });

  test('registers the audit-logs routes and controller with audit-logs', () => {
    setup(['audit-logs']);

    const admin = getAdminEE();

    expect(admin.routes).toHaveProperty('audit-logs');
    expect(admin.controllers).toHaveProperty('audit-logs');
    expect(admin.routes).not.toHaveProperty('sso');
  });

  test('register runs the EE register and adds no audit-logs service without audit-logs', async () => {
    setup();

    await getAdminEE().register({ strapi: global.strapi });

    expect(executeEERegister).toHaveBeenCalledWith({ strapi: global.strapi });
    expect(global.strapi.add).not.toHaveBeenCalled();
  });
});
