import { describe, test, expect, vi } from 'vitest';
import metrics from '../metrics';

describe('Metrics', () => {
  test('sendDidInviteUser', async () => {
    const send = vi.fn(() => Promise.resolve());
    const countUsers = vi.fn(() => Promise.resolve(2));
    const countRoles = vi.fn(() => Promise.resolve(3));
    global.strapi = {
      telemetry: { send },
      admin: {
        services: {
          user: { count: countUsers },
          role: { count: countRoles },
        },
      },
    } as any;

    await metrics.sendDidInviteUser();

    expect(send).toHaveBeenCalledWith('didInviteUser', {
      groupProperties: {
        numberOfRoles: 3,
        numberOfUsers: 2,
      },
    });
    expect(countUsers).toHaveBeenCalledWith();
    expect(countRoles).toHaveBeenCalledWith();
  });

  test('sendDidUpdateRolePermissions', async () => {
    const send = vi.fn(() => Promise.resolve());
    global.strapi = {
      telemetry: { send },
    } as any;

    await metrics.sendDidUpdateRolePermissions();

    expect(send).toHaveBeenCalledWith('didUpdateRolePermissions');
  });

  test('didChangeInterfaceLanguage', async () => {
    const getLanguagesInUse = vi.fn(() => Promise.resolve(['en', 'fr', 'en']));
    const send = vi.fn(() => Promise.resolve());

    global.strapi = {
      telemetry: { send },
      admin: {
        services: {
          user: { getLanguagesInUse },
        },
      },
    } as any;

    await metrics.sendDidChangeInterfaceLanguage();

    expect(getLanguagesInUse).toHaveBeenCalledWith();
    expect(send).toHaveBeenCalledWith('didChangeInterfaceLanguage', {
      userProperties: {
        languagesInUse: ['en', 'fr', 'en'],
      },
    });
  });
});
