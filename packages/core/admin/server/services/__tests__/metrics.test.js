'use strict';

const metricsService = require('../metrics');

describe('Metrics', () => {
  test('sendDidInviteUser', async () => {
    const send = jest.fn(() => Promise.resolve());
    const countUsers = jest.fn(() => Promise.resolve(2));
    const countRoles = jest.fn(() => Promise.resolve(3));
    global.strapi = {
      telemetry: { send },
      admin: {
        services: {
          user: { count: countUsers },
          role: { count: countRoles },
        },
      },
    };

    const adminUserId = 'testhash';

    await metricsService.sendDidInviteUser(adminUserId);

    expect(send).toHaveBeenCalledWith(adminUserId, 'didInviteUser', {
      numberOfRoles: 3,
      numberOfUsers: 2,
    });
    expect(countUsers).toHaveBeenCalledWith();
    expect(countRoles).toHaveBeenCalledWith();
  });

  test('sendDidUpdateRolePermissions', async () => {
    const send = jest.fn(() => Promise.resolve());
    global.strapi = {
      telemetry: { send },
    };

    const adminUserId = 'testhash';

    await metricsService.sendDidUpdateRolePermissions(adminUserId);

    expect(send).toHaveBeenCalledWith(adminUserId, 'didUpdateRolePermissions');
  });

  test('didChangeInterfaceLanguage', async () => {
    const getLanguagesInUse = jest.fn(() => Promise.resolve(['en', 'fr', 'en']));
    const send = jest.fn(() => Promise.resolve());

    global.strapi = {
      telemetry: { send },
      admin: {
        services: {
          user: { getLanguagesInUse },
        },
      },
    };

    await metricsService.sendDidChangeInterfaceLanguage();

    expect(getLanguagesInUse).toHaveBeenCalledWith();
    expect(send).toHaveBeenCalledWith('', 'didChangeInterfaceLanguage', {
      languagesInUse: ['en', 'fr', 'en'],
    });
  });
});
