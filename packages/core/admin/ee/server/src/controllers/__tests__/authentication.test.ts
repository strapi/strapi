import { emitAudit } from '@strapi/utils';

import authenticationController from '../authentication';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

describe('EE authentication controller', () => {
  describe('updateProviderLoginOptions', () => {
    const storedProviders = { autoRegister: false, defaultRole: null, ssoLockedRoles: [1] };

    const setup = () => {
      const adminStore = {
        get: jest.fn(async () => ({ providers: storedProviders, other: 'kept' })),
        set: jest.fn(),
      };

      global.strapi = {
        store: jest.fn(async () => adminStore),
        admin: { services: { role: { exists: jest.fn(async () => true) } } },
        telemetry: { send: jest.fn() },
      } as any;

      return adminStore;
    };

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('stores the options and emits sso-settings.update with the changes', async () => {
      const adminStore = setup();
      const body = { autoRegister: true, defaultRole: 3, ssoLockedRoles: [1] };
      const ctx = { request: { body } } as any;

      await authenticationController.updateProviderLoginOptions(ctx);

      expect(adminStore.set).toHaveBeenCalledWith({
        key: 'auth',
        value: { providers: body, other: 'kept' },
      });
      expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'sso-settings.update', {
        changes: {
          autoRegister: { before: false, after: true },
          defaultRole: { before: null, after: 3 },
        },
      });
      expect(ctx.body).toEqual({ data: body });
    });

    test('emits nothing when no option changed', async () => {
      const adminStore = setup();
      const ctx = { request: { body: { ...storedProviders } } } as any;

      await authenticationController.updateProviderLoginOptions(ctx);

      expect(adminStore.set).toHaveBeenCalled();
      expect(emitAudit).not.toHaveBeenCalled();
    });
  });
});
