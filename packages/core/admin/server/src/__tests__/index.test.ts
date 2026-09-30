import type { Modules } from '@strapi/types';

describe('admin server module', () => {
  const loadAdmin = async (enabledFeatures: Modules.EE.FeatureName[] = []) => {
    global.strapi = {
      EE: enabledFeatures.length > 0,
      config: { get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue) },
      ee: {
        features: {
          isEnabled: jest.fn((name: Modules.EE.FeatureName) => enabledFeatures.includes(name)),
        },
      },
    } as any;

    let admin: any;
    // The module merges at import time, so it must be imported after strapi is set
    await jest.isolateModulesAsync(async () => {
      admin = (await import('..')).default;
    });

    return admin;
  };

  test('merges the EE module without a license', async () => {
    const admin = await loadAdmin();

    expect(Object.keys(admin.routes)).toEqual(['admin']);
    expect(admin.contentTypes).toHaveProperty('audit-log');
    expect(admin.services).toHaveProperty('seat-enforcement');
    expect(admin.services).toHaveProperty('persist-tables');
    expect(admin.services.user).toHaveProperty('removeFromEEDisabledUsersList');
    expect(admin.controllers.user).toHaveProperty('isSSOLocked');
  });

  test('adds the feature routes of the license', async () => {
    const admin = await loadAdmin(['sso', 'audit-logs']);

    expect(Object.keys(admin.routes).sort()).toEqual(['admin', 'audit-logs', 'sso']);
    expect(admin.controllers).toHaveProperty('audit-logs');
  });
});
